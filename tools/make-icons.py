"""Génère les icônes PNG de la PWA : six pads sur fond sombre."""
import struct
import zlib
from pathlib import Path

BACKGROUND = (15, 19, 26, 255)
PAD_COLOR = (90, 169, 230, 255)
SUPERSAMPLE = 4
MARGIN_RATIO = 0.16
GAP_RATIO = 0.06
CORNER_RATIO = 0.18
COLUMNS = 3
ROWS = 2
SIZES = (192, 512)
OUTPUT_DIRECTORY = Path(__file__).resolve().parent.parent / 'icons'


def rounded_rectangle(canvas, left, top, width, height, radius, color):
    for y in range(top, top + height):
        for x in range(left, left + width):
            offset_x = min(x - left, left + width - 1 - x)
            offset_y = min(y - top, top + height - 1 - y)
            if offset_x < radius and offset_y < radius:
                corner_x = radius - 1 - offset_x
                corner_y = radius - 1 - offset_y
                if corner_x * corner_x + corner_y * corner_y > radius * radius:
                    continue
            canvas[y][x] = color


def render(size):
    canvas = [[BACKGROUND] * size for _ in range(size)]
    margin = round(size * MARGIN_RATIO)
    grid_width = size - 2 * margin
    gap = round(grid_width * GAP_RATIO)
    pad_width = (grid_width - (COLUMNS - 1) * gap) // COLUMNS
    pad_height = round(pad_width * 0.78)
    grid_height = ROWS * pad_height + gap
    top = (size - grid_height) // 2
    radius = max(1, round(min(pad_width, pad_height) * CORNER_RATIO))

    for row in range(ROWS):
        for column in range(COLUMNS):
            rounded_rectangle(
                canvas,
                margin + column * (pad_width + gap),
                top + row * (pad_height + gap),
                pad_width,
                pad_height,
                radius,
                PAD_COLOR,
            )
    return canvas


def downsample(canvas, size, factor):
    samples = factor * factor
    reduced = []
    for y in range(size):
        row = []
        for x in range(size):
            totals = [0, 0, 0, 0]
            for sub_y in range(factor):
                source_row = canvas[y * factor + sub_y]
                for sub_x in range(factor):
                    pixel = source_row[x * factor + sub_x]
                    for channel in range(4):
                        totals[channel] += pixel[channel]
            row.append(tuple(total // samples for total in totals))
        reduced.append(row)
    return reduced


def chunk(tag, payload):
    body = tag + payload
    return struct.pack('>I', len(payload)) + body + struct.pack('>I', zlib.crc32(body))


def write_png(path, canvas, size):
    raw = bytearray()
    for row in canvas:
        raw.append(0)
        for pixel in row:
            raw += bytes(pixel)
    header = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    path.write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', header)
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b'')
    )


for icon_size in SIZES:
    large = render(icon_size * SUPERSAMPLE)
    write_png(OUTPUT_DIRECTORY / f'icon-{icon_size}.png', downsample(large, icon_size, SUPERSAMPLE), icon_size)
    print(f'icons/icon-{icon_size}.png')
