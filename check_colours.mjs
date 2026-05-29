// Convert hex to HSL and calculate hue
function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  if (max !== min) {
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6
    } else {
      h = ((r - g) / d + 4) / 6
    }
  }
  
  return h * 360 // Return hue in degrees (0-360)
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  // Calculate relative luminance
  const [rs, gs, bs] = [r, g, b].map(x => {
    x = x / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

const colours = {
  'Antica': '#ef4444',
  'Portswana': '#ffd740',
  'Samosia': '#69f0ae',
  'Bintu': '#f48fb1',
  'Mertante': '#c8e6c9',
  'Rostotto': '#e040fb',
  'Jasna': '#ff7043',
  'Geldar': '#4fc3f7',
  'Halportia': '#b0bec5',
  'Barria': '#80deea'
}

const hues = Object.entries(colours).map(([name, hex]) => ({
  name,
  hex,
  hue: hexToHue(hex),
  luminance: getLuminance(hex)
}))

hues.sort((a, b) => a.hue - b.hue)

console.log('Colour hue analysis:')
console.log('Name        | Hex     | Hue    | Luminance')
console.log('-'.repeat(50))
hues.forEach(c => {
  console.log(`${c.name.padEnd(11)} | ${c.hex} | ${c.hue.toFixed(0).padStart(3)}°   | ${c.luminance.toFixed(4)}`)
})

// Check hue separations
console.log('\nHue separations (circular):')
for (let i = 0; i < hues.length; i++) {
  const current = hues[i]
  const next = hues[(i + 1) % hues.length]
  
  let diff = next.hue - current.hue
  if (diff < 0) diff += 360
  
  console.log(`${current.name.padEnd(11)} -> ${next.name.padEnd(11)}: ${diff.toFixed(0).padStart(3)}°`)
}

// Check minimum separation
const minSep = Math.min(
  ...hues.map((_, i) => {
    const current = hues[i]
    const next = hues[(i + 1) % hues.length]
    let diff = next.hue - current.hue
    if (diff < 0) diff += 360
    return diff
  })
)

console.log(`\nMinimum hue separation: ${minSep.toFixed(0)}° (required: 30°)`)

// Check contrast against #07021a
const bgLuminance = getLuminance('#07021a')
console.log(`\nBackground (#07021a) luminance: ${bgLuminance.toFixed(6)}`)
console.log('Colours with luminance above 0.1 (typically sufficient contrast):')
hues.forEach(c => {
  const contrast = (Math.max(bgLuminance, c.luminance) + 0.05) / (Math.min(bgLuminance, c.luminance) + 0.05)
  const status = contrast >= 2 ? '✓' : '✗'
  console.log(`  ${status} ${c.name.padEnd(11)} contrast ratio: ${contrast.toFixed(2)}`)
})
