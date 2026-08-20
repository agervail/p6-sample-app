export function computePeaks(channels, bucketCount) {
  const frames = channels[0].length;
  const framesPerBucket = frames / bucketCount;
  const minimums = new Float32Array(bucketCount);
  const maximums = new Float32Array(bucketCount);

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * framesPerBucket);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * framesPerBucket));
    let lowest = 0;
    let highest = 0;
    for (const channel of channels) {
      for (let frame = start; frame < end && frame < frames; frame += 1) {
        const value = channel[frame];
        if (value < lowest) lowest = value;
        if (value > highest) highest = value;
      }
    }
    minimums[bucket] = lowest;
    maximums[bucket] = highest;
  }
  return { minimums, maximums };
}

export function peakOf(peaks) {
  let peak = 0;
  for (let bucket = 0; bucket < peaks.maximums.length; bucket += 1) {
    peak = Math.max(peak, peaks.maximums[bucket], -peaks.minimums[bucket]);
  }
  return peak;
}
