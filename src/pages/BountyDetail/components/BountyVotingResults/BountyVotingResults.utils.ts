/**
 * Utilities for generating SVG paths based on Substrate decision curves.
 */

export const generatePath = (curve: any, decisionPeriod: number): string => {
  if (!curve || !decisionPeriod) return ""

  if (curve.type === "LinearDecreasing") {
    const startY = 100 - curve.start
    const endY = 100 - curve.end

    let kneeX = 100
    if (curve.length && decisionPeriod > 0) {
      kneeX = (curve.length / decisionPeriod) * 100
    }
    if (kneeX > 100) kneeX = 100

    return `M0,${startY} L${kneeX},${endY} L100,${endY}`
  } else if (curve.type === "Reciprocal") {
    const points: string[] = []
    const steps = 50

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const xInfo = progress * decisionPeriod

      const numerator = BigInt(curve.factor)
      const denominator = BigInt(Math.floor(xInfo)) + BigInt(curve.xOffset)
      const yVal = Number(numerator / denominator) + curve.yOffset

      const percentage = (yVal / 1_000_000_000) * 100
      const svgY = 100 - percentage

      points.push(`${progress * 100},${svgY}`)
    }
    return `M${points.join(" L")}`
  } else if (curve.type === "SteppedDecreasing") {
    const startY = 100 - curve.begin
    const endY = 100 - curve.end
    return `M0,${startY} L100,${endY}`
  }

  if (curve.start !== undefined && curve.end !== undefined) {
    const startY = 100 - curve.start
    const endY = 100 - curve.end
    let kneeX = 100
    if (curve.length && decisionPeriod > 0) {
      kneeX = (curve.length / decisionPeriod) * 100
    }
    if (kneeX > 100) kneeX = 100
    return `M0,${startY} L${kneeX},${endY} L100,${endY}`
  }

  return ""
}
