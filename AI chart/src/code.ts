figma.showUI(__html__, { width: 600, height: 1000 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-chart') {
    const { data, options } = msg;
    await drawChart(data, options);
  }
};

async function drawChart(data: any, options: any) {
  // Load fonts
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // Create container frame
  const frame = figma.createFrame();
  frame.name = "AI Chart";
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.itemSpacing = 16;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.cornerRadius = 8;
  frame.effects = [{
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 10,
    visible: true,
    blendMode: "NORMAL"
  }];

  // Chart Area
  const chartArea = figma.createFrame();
  chartArea.name = "Chart Area";
  // Set fixed size initially, but allow it to be resized in auto layout context if needed
  chartArea.resize(600, 300); 
  chartArea.layoutMode = "NONE"; // Chart content is absolute positioned vectors
  chartArea.fills = [];
  frame.appendChild(chartArea);

  // Calculate scales
  let maxVal = -Infinity;
  let minVal = Infinity;
  data.datasets.forEach((ds: any) => {
    ds.data.forEach((v: number) => {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  // Round maxVal up to nice number for Y axis
  const niceMax = Math.ceil(maxVal / 10) * 10;
  const niceMin = Math.floor(minVal / 10) * 10; // Or 0
  const range = niceMax - niceMin; // Ensure non-zero
  
  const width = 600;
  const height = 300;
  const padding = 16; // Internal padding for chart drawing inside the frame
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Draw Grid & Y-Axis Labels
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const value = niceMin + (range * i) / gridSteps;
    const y = height - padding - (i / gridSteps) * graphHeight;

    // Grid Line
    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = padding;
    line.y = y;
    line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    line.strokeCap = "ROUND";
    line.dashPattern = [4, 4];
    chartArea.appendChild(line);

    // Label
    const label = figma.createText();
    label.characters = Math.round(value).toString();
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    label.x = 0;
    label.y = y - 6;
    label.resize(padding - 8, 12);
    label.textAlignHorizontal = "RIGHT";
    chartArea.appendChild(label);
  }

  // Draw X-Axis Labels
  const stepX = graphWidth / (data.labels.length - 1);
  data.labels.forEach((text: string, i: number) => {
    const x = padding + i * stepX;
    const label = figma.createText();
    label.characters = text;
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    label.x = x - 20; // Center align roughly
    label.y = height - padding + 8;
    label.resize(40, 12);
    label.textAlignHorizontal = "CENTER";
    chartArea.appendChild(label);
  });

  // Draw Lines
  data.datasets.forEach((ds: any) => {
    const pathData = ds.data.map((val: number, i: number) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - niceMin) / (range || 1)) * graphHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const vector = figma.createVector();
    vector.vectorPaths = [{
      windingRule: "NONZERO",
      data: pathData
    }];
    const rgb = hexToRgb(ds.color);
    vector.strokes = [{ type: 'SOLID', color: rgb }];
    vector.strokeWeight = 2;
    vector.strokeJoin = "ROUND";
    vector.strokeCap = "ROUND";
    chartArea.appendChild(vector);

    // Optional: Add points
    ds.data.forEach((val: number, i: number) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - niceMin) / (range || 1)) * graphHeight;
      // Skip points for cleaner look or add them? 
      // Let's add small circles for high fidelity look
      const dot = figma.createEllipse();
      dot.resize(6, 6);
      dot.x = x - 3;
      dot.y = y - 3;
      dot.fills = [{ type: 'SOLID', color: {r:1, g:1, b:1} }];
      dot.strokes = [{ type: 'SOLID', color: rgb }];
      dot.strokeWeight = 2;
      chartArea.appendChild(dot);
    });
  });

  // Threshold Line (if selected)
  if (options.type === 'threshold') {
    const thresholdY = height - padding - 0.8 * graphHeight;
    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = padding;
    line.y = thresholdY;
    line.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    line.dashPattern = [4, 4];
    chartArea.appendChild(line);

    const label = figma.createText();
    label.characters = "Threshold";
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    label.x = width - padding + 4;
    label.y = thresholdY - 6;
    chartArea.appendChild(label);
  }

  // Legend Area
  const legendFrame = figma.createFrame();
  legendFrame.layoutMode = "HORIZONTAL";
  legendFrame.counterAxisSizingMode = "AUTO";
  legendFrame.itemSpacing = 16;
  legendFrame.fills = [];
  
  data.datasets.forEach((ds: any, i: number) => {
    const item = figma.createFrame();
    item.layoutMode = "HORIZONTAL";
    item.counterAxisSizingMode = "AUTO";
    item.itemSpacing = 8;
    item.fills = [];
    item.verticalPadding = 4;
    item.horizontalPadding = 4;

    const rect = figma.createRectangle();
    rect.resize(12, 12);
    rect.cornerRadius = 2;
    rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
    item.appendChild(rect);

    const label = figma.createText();
    label.characters = `Series ${i+1}`; // Or use some label
    label.fontSize = 12;
    item.appendChild(label);

    legendFrame.appendChild(item);
  });
  frame.appendChild(legendFrame);

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}
