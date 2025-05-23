const svg = document.getElementById('mindmap-canvas')
const addBtn = document.getElementById('add-node')
const saveBtn = document.getElementById('save-map')
const loadBtn = document.getElementById('load-map')

let nodeId = 0
let dragLine = null

let historyStack = []
let redoStack = []

function saveHistory() {
  const nodes = []
  document.querySelectorAll(".node").forEach(node => {
    const transform = node.getAttribute("transform").match(/translate\((.*),\s*(.*)\)/)
    const x = parseFloat(transform[1])
    const y = parseFloat(transform[2])
    const label = node.querySelector(".label").innerHTML
    const width = parseFloat(node.dataset.width)
    const height = parseFloat(node.dataset.height)
    const fill = node.dataset.fill || "#ffffff"
    nodes.push({ id: node.dataset.id, x, y, label, width, height, fill })
  })

  const lines = []
  document.querySelectorAll("line").forEach(line => {
    lines.push({
      from: line.dataset.from,
      to: line.dataset.to,
      color: line.getAttribute("stroke"),
      arrow: line.dataset.arrow,
      fromConnector: line.dataset.fromConnector,
      toConnector: line.dataset.toConnector
    })
  })

  historyStack.push({ nodes, lines })
  if (historyStack.length > 100) historyStack.shift()
  redoStack = []
}

let draggingFrom = null
let isDraggingNode = false
let dragTarget = null
let offsetX = 0
let offsetY = 0
let currentNodeColor = "#ffec99"
let currentLineColor = "#000000"
let currentNodeSize = "medium"
let currentArrowType = "none"  // none, start, end, both
let resizingNode = null
let resizingOffset = {}
let currentFontSize = "medium"  // small, medium, large
let isBold = false


const sizeMap = {
  small: { width: 120, height: 50 },
  medium: { width: 180, height: 70 },
  large: { width: 250, height: 100 }
}

document.querySelectorAll(".node-color").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".node-color").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")
    currentNodeColor = btn.dataset.color
  })
})
document.querySelectorAll(".line-color").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".line-color").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")
    currentLineColor = btn.dataset.color
  })
})
document.querySelectorAll(".size-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")
    currentNodeSize = btn.dataset.size
  })
})
document.querySelectorAll(".arrow-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".arrow-btn").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")
    currentArrowType = btn.dataset.arrow
  })
})

document.querySelectorAll(".font-size-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const size = btn.dataset.font
    let px = "16px"
    if (size === "small") px = "12px"
    if (size === "large") px = "20px"

    document.querySelectorAll(".font-size-btn").forEach(b => b.classList.remove("selected"))
    btn.classList.add("selected")

    const sel = window.getSelection()
    if (!sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const label = range.commonAncestorContainer.closest?.(".label")
    if (!label) return

    const fragment = range.extractContents()

    fragment.querySelectorAll("span[style*='font-size']").forEach(span => {
      const parent = span.parentNode
      while (span.firstChild) parent.insertBefore(span.firstChild, span)
      parent.removeChild(span)
    })

    const newSpan = document.createElement("span")
    newSpan.style.fontSize = px
    newSpan.appendChild(fragment)
    range.insertNode(newSpan)
  })
})





document.getElementById("toggle-bold").addEventListener("click", () => {
  const sel = window.getSelection()
  if (!sel.rangeCount) return
  const range = sel.getRangeAt(0)
  const label = range.commonAncestorContainer.closest?.(".label")
  if (!label) return

  const fragment = range.extractContents()

  let hadBold = false

  fragment.querySelectorAll("b").forEach(b => {
    hadBold = true
    const parent = b.parentNode
    while (b.firstChild) parent.insertBefore(b.firstChild, b)
    parent.removeChild(b)
  })

  if (!hadBold) {
    const bold = document.createElement("b")
    bold.appendChild(fragment)
    range.insertNode(bold)
  } else {
    range.insertNode(fragment)
  }

  document.getElementById("toggle-bold").classList.toggle("selected", !hadBold)
})






document.querySelector(".node-color").classList.add("selected")
document.querySelector(".line-color").classList.add("selected")
document.querySelector(".size-btn[data-size='medium']").classList.add("selected")
document.querySelector(".arrow-btn[data-arrow='none']").classList.add("selected")

addBtn.onclick = () => {
  const pos = sizeMap[currentNodeSize]
  createNode(100 + Math.random() * 300, 100 + Math.random() * 300, "新しいノード", currentNodeColor, pos.width, pos.height)
}

function createNode(x, y, label, fillColor, width = 120, height = 50) {
const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
group.classList.add("node", "appear")
svg.appendChild(group)

setTimeout(() => {
  group.classList.remove("appear")
}, 300) 

group.setAttribute("transform", `translate(${x}, ${y})`)
  group.dataset.id = "node-" + nodeId++
  group.dataset.fill = fillColor
  group.dataset.width = width
  group.dataset.height = height

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  rect.setAttribute("width", width)
  rect.setAttribute("height", height)
  rect.setAttribute("rx", 10)
  rect.setAttribute("fill", fillColor)
  rect.setAttribute("stroke", "#333")
  rect.setAttribute("stroke-width", "2")

  const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
  foreign.setAttribute("width", width)
  foreign.setAttribute("height", height)
  const div = document.createElement("div")
  div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml")
div.classList.add("label")
div.contentEditable = true
div.innerHTML = label

if (currentFontSize === "small") div.style.fontSize = "12px"
else if (currentFontSize === "large") div.style.fontSize = "20px"
else div.style.fontSize = "16px"

div.style.fontWeight = isBold ? "bold" : "normal"

  const delBtn = document.createElement("button")
  delBtn.textContent = "❌"
  delBtn.classList.add("delete-btn")
  delBtn.onclick = (ev) => {
    ev.stopPropagation()
    removeNode(group)
  }

  const resizeHandle = document.createElement("div")
  resizeHandle.classList.add("resize-handle")
  resizeHandle.onmousedown = (e) => {
    e.stopPropagation()
    resizingNode = group
    resizingOffset = {
      startX: e.clientX,
      startY: e.clientY,
      startW: parseFloat(group.dataset.width),
      startH: parseFloat(group.dataset.height)
    }
  }
  div.appendChild(resizeHandle)
  foreign.appendChild(div)

  const outConnector = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  outConnector.classList.add("connector", "out")
  outConnector.setAttribute("r", 5)
  outConnector.setAttribute("cx", width)
  outConnector.setAttribute("cy", height / 2)

  const inConnector = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  inConnector.classList.add("connector", "in")
  inConnector.setAttribute("r", 5)
  inConnector.setAttribute("cx", 0)
  inConnector.setAttribute("cy", height / 2)

const delFo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
delFo.setAttribute("width", 24)
delFo.setAttribute("height", 24)
delFo.setAttribute("x", -12)  
delFo.setAttribute("y", -12)

const btnWrapper = document.createElement("div")
btnWrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml")
btnWrapper.innerHTML = `<button class="delete-btn">❌</button>`
delFo.appendChild(btnWrapper)

btnWrapper.querySelector("button").onclick = (ev) => {
  ev.stopPropagation()
  removeNode(group)
}



  group.appendChild(rect)
  group.appendChild(foreign)
  group.appendChild(outConnector)
  group.appendChild(inConnector)
group.appendChild(delFo)
  svg.appendChild(group)

  setupConnectorEvents(group)
  setupLabelDrag(div, group)
}

function setupLabelDrag(labelDiv, group) {
  labelDiv.addEventListener("mousedown", (e) => {
    isDraggingNode = true
    dragTarget = group
    const match = group.getAttribute("transform").match(/translate\((.*),\s*(.*)\)/)
    offsetX = e.clientX - parseFloat(match[1])
    offsetY = e.clientY - parseFloat(match[2])
  })
}

function setupConnectorEvents(node) {
  node.querySelectorAll("circle.connector").forEach(connector => {
    connector.addEventListener("mousedown", (e) => {
      e.stopPropagation()
      const svgPoint = svg.createSVGPoint()
      svgPoint.x = e.clientX
      svgPoint.y = e.clientY
      const CTM = svg.getScreenCTM().inverse()
      const point = svgPoint.matrixTransform(CTM)

      dragLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      dragLine.setAttribute("x1", point.x)
      dragLine.setAttribute("y1", point.y)
      dragLine.setAttribute("x2", point.x)
      dragLine.setAttribute("y2", point.y)
      dragLine.setAttribute("stroke", currentLineColor)
      dragLine.setAttribute("stroke-width", "2")
      svg.appendChild(dragLine)
      draggingFrom = { node, connector }
    })
  })
}

function connectNodes(fromNode, toNode, fromConnector, toConnector) {
  const [x1, y1] = getConnectorAbsPosition(fromNode, fromConnector)
  const [x2, y2] = getConnectorAbsPosition(toNode, toConnector)

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
  line.setAttribute("x1", x1)
  line.setAttribute("y1", y1)
  line.setAttribute("x2", x2)
  line.setAttribute("y2", y2)
  line.setAttribute("stroke", currentLineColor)

  if (currentArrowType === "start") line.setAttribute("marker-start", "url(#arrow-start)")
  if (currentArrowType === "end") line.setAttribute("marker-end", "url(#arrow-end)")
  if (currentArrowType === "both") {
    line.setAttribute("marker-start", "url(#arrow-start)")
    line.setAttribute("marker-end", "url(#arrow-end)")
  }

  line.dataset.from = fromNode.dataset.id
line.dataset.to = toNode.dataset.id
line.dataset.fromConnector = fromConnector.classList.contains("in") ? "in" : "out"
line.dataset.toConnector = toConnector.classList.contains("in") ? "in" : "out"
  line.onclick = () => svg.removeChild(line)
  svg.insertBefore(line, svg.firstChild)
  line.dataset.arrow = currentArrowType

}

function getConnectorAbsPosition(node, connector) {
  const match = node.getAttribute("transform").match(/translate\((.*),\s*(.*)\)/)
  const nx = parseFloat(match[1])
  const ny = parseFloat(match[2])
  const cx = parseFloat(connector.getAttribute("cx"))
  const cy = parseFloat(connector.getAttribute("cy"))
  return [nx + cx, ny + cy]
}

function updateLines() {
  document.querySelectorAll("line").forEach(line => {
    const from = document.querySelector(`[data-id='${line.dataset.from}']`)
    const to = document.querySelector(`[data-id='${line.dataset.to}']`)
    if (from && to) {
      const fromConnector = from.querySelector(`.${line.dataset.fromConnector}`)
const toConnector = to.querySelector(`.${line.dataset.toConnector}`)
const [x1, y1] = getConnectorAbsPosition(from, fromConnector)
const [x2, y2] = getConnectorAbsPosition(to, toConnector)

      line.setAttribute("x1", x1)
      line.setAttribute("y1", y1)
      line.setAttribute("x2", x2)
      line.setAttribute("y2", y2)

      line.removeAttribute("marker-start")
      line.removeAttribute("marker-end")
      if (line.dataset.arrow === "start") line.setAttribute("marker-start", "url(#arrow-start)")
      if (line.dataset.arrow === "end") line.setAttribute("marker-end", "url(#arrow-end)")
      if (line.dataset.arrow === "both") {
        line.setAttribute("marker-start", "url(#arrow-start)")
        line.setAttribute("marker-end", "url(#arrow-end)")
      }
    }
  })
}


window.addEventListener("mousemove", (e) => {
  if (isDraggingNode && dragTarget) {
    const x = e.clientX - offsetX
    const y = e.clientY - offsetY
    dragTarget.setAttribute("transform", `translate(${x}, ${y})`)
    updateLines()
  }

  if (dragLine) {
  const svgPoint = svg.createSVGPoint()
  svgPoint.x = e.clientX
  svgPoint.y = e.clientY
  const CTM = svg.getScreenCTM().inverse()
  const point = svgPoint.matrixTransform(CTM)

  dragLine.setAttribute("x2", point.x)
  dragLine.setAttribute("y2", point.y)

  svg.querySelectorAll("circle.connector").forEach(connector => {
    const node = connector.closest("g.node")
    const [cx, cy] = getConnectorAbsPosition(node, connector)
    const dist = Math.hypot(cx - point.x, cy - point.y)

    connector.classList.remove("glow", "near") 

    if (dist < 60) {
      connector.classList.add("glow")
      if (dist < 15) {
        connector.classList.add("near")
      }
    }
  })
}


  if (resizingNode) {
    const dx = e.clientX - resizingOffset.startX
    const dy = e.clientY - resizingOffset.startY
    const newW = Math.max(80, resizingOffset.startW + dx)
    const newH = Math.max(30, resizingOffset.startH + dy)
    resizingNode.dataset.width = newW
    resizingNode.dataset.height = newH
    const rect = resizingNode.querySelector("rect")
    rect.setAttribute("width", newW)
    rect.setAttribute("height", newH)
    const fo = resizingNode.querySelector("foreignObject")
    fo.setAttribute("width", newW)
    fo.setAttribute("height", newH)
    resizingNode.querySelector(".out").setAttribute("cx", newW)
    resizingNode.querySelector(".out").setAttribute("cy", newH / 2)
    resizingNode.querySelector(".in").setAttribute("cy", newH / 2)
    updateLines()
  }
})

window.addEventListener("mouseup", (e) => {
  isDraggingNode = false
  dragTarget = null
  resizingNode = null

  if (dragLine) {
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = e.clientX
    svgPoint.y = e.clientY
    const CTM = svg.getScreenCTM().inverse()
    const point = svgPoint.matrixTransform(CTM)

    let targetNode = null
    let targetConnector = null

    svg.querySelectorAll("circle.connector").forEach(connector => {
      const node = connector.closest("g.node")
      const [cx, cy] = getConnectorAbsPosition(node, connector)
      const dist = Math.hypot(cx - point.x, cy - point.y)
      if (dist < 10) {
        targetNode = node
        targetConnector = connector
      }
    })

    if (targetNode && targetNode !== draggingFrom.node) {
      connectNodes(draggingFrom.node, targetNode, draggingFrom.connector, targetConnector)
    }

     svg.querySelectorAll("circle.connector").forEach(c => {
    c.classList.remove("glow", "near")
  })

  svg.removeChild(dragLine)
  dragLine = null
  draggingFrom = null
}
})

function removeNode(node) {
  const nodeId = node.dataset.id
  document.querySelectorAll("line").forEach(line => {
    if (line.dataset.from === nodeId || line.dataset.to === nodeId) {
      svg.removeChild(line)
    }
  })
  svg.removeChild(node)
}


document.getElementById("export-json").addEventListener("click", () => {
  const nodes = []
  document.querySelectorAll(".node").forEach(node => {
    const transform = node.getAttribute("transform").match(/translate\((.*),\s*(.*)\)/)
    const x = parseFloat(transform[1])
    const y = parseFloat(transform[2])
const label = node.querySelector(".label").innerHTML || ""
    const width = parseFloat(node.dataset.width)
    const height = parseFloat(node.dataset.height)
    const fill = node.dataset.fill || "#ffffff"
    nodes.push({ id: node.dataset.id, x, y, label, width, height, fill })
  })

  const lines = []
  document.querySelectorAll("line").forEach(line => {
    lines.push({
      from: line.dataset.from,
      to: line.dataset.to,
      color: line.getAttribute("stroke"),
      arrow: line.dataset.arrow,
      fromConnector: line.dataset.fromConnector,
      toConnector: line.dataset.toConnector
    })
  })

  const data = { nodes, lines }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "mindmap.json"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
})

document.getElementById("import-json").addEventListener("change", (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const data = JSON.parse(reader.result)
    svg.innerHTML = document.querySelector("defs").outerHTML 
    nodeId = 0

    const idMap = {}

    data.nodes.forEach(n => {
      createNode(n.x, n.y, n.label, n.fill, n.width, n.height)
      idMap[n.id] = true
      if (parseInt(n.id.split('-')[1]) >= nodeId) {
        nodeId = parseInt(n.id.split('-')[1]) + 1
      }
    })

    data.lines.forEach(l => {
      const from = document.querySelector(`[data-id="${l.from}"]`)
      const to = document.querySelector(`[data-id="${l.to}"]`)
      const fromConnector = from?.querySelector(`.${l.fromConnector}`)
      const toConnector = to?.querySelector(`.${l.toConnector}`)
      if (from && to && fromConnector && toConnector) {
        const [x1, y1] = getConnectorAbsPosition(from, fromConnector)
        const [x2, y2] = getConnectorAbsPosition(to, toConnector)

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("x1", x1)
        line.setAttribute("y1", y1)
        line.setAttribute("x2", x2)
        line.setAttribute("y2", y2)
        line.setAttribute("stroke", l.color || "#000000")
        if (l.arrow === "start") line.setAttribute("marker-start", "url(#arrow-start)")
        if (l.arrow === "end") line.setAttribute("marker-end", "url(#arrow-end)")
        if (l.arrow === "both") {
          line.setAttribute("marker-start", "url(#arrow-start)")
          line.setAttribute("marker-end", "url(#arrow-end)")
        }

        line.dataset.from = l.from
        line.dataset.to = l.to
        line.dataset.arrow = l.arrow
        line.dataset.fromConnector = l.fromConnector
        line.dataset.toConnector = l.toConnector
        line.onclick = () => svg.removeChild(line)
        svg.insertBefore(line, svg.firstChild)
      }
    })
  }

  reader.readAsText(file)
})

window.addEventListener("beforeunload", function (e) {
  e.preventDefault()
  e.returnValue = "マップ内容は保存されていません"
})


const importTrigger = document.getElementById("import-trigger")
const importInput = document.getElementById("import-json")

importTrigger.addEventListener("click", () => {
  const confirmed = confirm("現在の作業内容は失われます。\nファイル保存してから読み込むことをおすすめします。\n読み込みを続行しますか？")
  if (confirmed) {
    importInput.click() 
  }
})

importInput.addEventListener("change", function (e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = function (event) {
    const json = JSON.parse(event.target.result)
    loadFromJson(json)
  }
  reader.readAsText(file)
})

document.getElementById("export-png").addEventListener("click", () => {
  const serializer = new XMLSerializer()
  const clonedSvg = svg.cloneNode(true)

  clonedSvg.querySelectorAll(".delete-btn, .resize-handle").forEach(el => el.remove())

  const defs = svg.querySelector("defs")
  if (defs) {
    const defsClone = defs.cloneNode(true)
    clonedSvg.insertBefore(defsClone, clonedSvg.firstChild)
  }

  const bbox = svg.getBoundingClientRect()
  const width = Math.ceil(bbox.width)
  const height = Math.ceil(bbox.height)

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${clonedSvg.innerHTML}</svg>`
  const img = new Image()
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  img.onload = () => {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0)

    const pngData = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = pngData
    a.download = "mindmap.png"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)))
})



document.getElementById("how-to-use-btn").addEventListener("click", () => {
  const guideOverlay = document.getElementById("guide-overlay")
  guideOverlay.style.display = "block"

  const boxes = guideOverlay.querySelectorAll(".guide-box, .guide-center-text")
  boxes.forEach((el, i) => {
    el.style.opacity = 0
    el.style.animation = "none"            
    el.offsetHeight                        
    el.style.animation = "fadeInUp 0.5s ease-out forwards"
    el.style.animationDelay = `${i * 0.2}s`
  })

  document.getElementById("close-guide").style.display = "block"
})

document.getElementById("close-guide").addEventListener("click", () => {
  document.getElementById("guide-overlay").style.display = "none"
  document.getElementById("close-guide").style.display = "none"
})

document.getElementById("how-to-use-btn").addEventListener("click", () => {
  const guideOverlay = document.getElementById("guide-overlay")
  guideOverlay.style.display = "block"

  const center = guideOverlay.querySelector(".guide-center-text")
  const boxes = guideOverlay.querySelectorAll(".guide-box")

  center.style.opacity = 0
  center.style.animation = "none"
  center.offsetHeight
  center.style.animation = "fadeInUp 0.5s ease-out forwards"
  center.style.animationDelay = `0s`

  boxes.forEach((el, i) => {
    el.style.opacity = 0
    el.style.animation = "none"
    el.offsetHeight
    el.style.animation = "fadeInUp 0.5s ease-out forwards"
    el.style.animationDelay = `${0.3 + i * 0.2}s`
  })

  document.getElementById("close-guide").style.display = "block"
})

