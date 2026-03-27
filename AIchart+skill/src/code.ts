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
  frame.primaryAxisSizingMode = "FIXED"; // fixed height so chartArea can grow
  frame.counterAxisSizingMode = "FIXED"; // fixed width
  frame.resize(600, 300);
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.itemSpacing = 8; // Title 与 Chart 间距 8px, Chart 与 Legend 间距 8px
  frame.counterAxisAlignItems = "MIN"; // 所有元素左对齐
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

  // 1. Title (Hug contents)
  const titleStr = options.title || "Basic Line Chart";
  const titleLabel = figma.createText();
  titleLabel.characters = titleStr;
  titleLabel.fontSize = 14;
  titleLabel.fontName = { family: "Inter", style: "Bold" };
  titleLabel.fills = [{ type: 'SOLID', color: hexToRgb('#0C0D0E') }];
  titleLabel.layoutAlign = "INHERIT"; // Hug width
  titleLabel.layoutSizingVertical = "HUG"; // Hug height
  frame.appendChild(titleLabel);

  // 2. Legend Area (Hug contents)
  const legendFrame = figma.createFrame();
  legendFrame.name = "Legend Area";
  legendFrame.layoutMode = "HORIZONTAL";
  legendFrame.counterAxisSizingMode = "AUTO";
  legendFrame.itemSpacing = 12; // itemGap: 12
  legendFrame.layoutAlign = "INHERIT"; // Hug width
  legendFrame.layoutSizingVertical = "HUG"; // Hug height
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
    rect.resize(18, 18); // itemWidth: 18, itemHeight: 18
    rect.cornerRadius = 4;
    rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
    item.appendChild(rect);

    const label = figma.createText();
    label.characters = ds.name || `Series ${i+1}`; 
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: hexToRgb('#737A87') }];
    item.appendChild(label);

    legendFrame.appendChild(item);
  });
  frame.appendChild(legendFrame);

  // Measure heights to calculate Chart Area size
  const titleHeight = titleLabel.height;
  const legendHeight = legendFrame.height;
  const width = 600;
  const height = 300;
  const availableWidth = width - 32;
  const availableHeight = height - 32 - titleHeight - 8 - legendHeight - 8;

  // 3. Chart Area (Fill container)
  const chartArea = figma.createFrame();
  chartArea.name = "Chart Area";
  chartArea.layoutMode = "NONE"; 
  chartArea.resize(availableWidth, availableHeight);
  chartArea.layoutAlign = "STRETCH"; // Width: Fill container
  chartArea.layoutGrow = 1;          // Height: Fill container
  chartArea.fills = [];
  chartArea.clipsContent = false;
  
  // Insert Chart Area between Title and Legend
  frame.insertChild(1, chartArea);

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
  
  const paddingLeft = 48; // Space for Y-axis labels
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 16; // Adjusting this directly will shift the X-axis line down
  const xAxisLabelGap = 8; // Introduce an explicit gap variable if needed, or we just want them flush
  
  // Since we want 0px gap between the X-axis labels and the X-axis line, and we don't want blank space below the labels,
  // we should set paddingBottom to exactly the height of the X-axis labels (which is 12px) + any desired gap.
  // If the gap is 0px, paddingBottom should be just 12px.
  // Let's set it to 12 to remove the blank space below the labels.
  const adjustedPaddingBottom = 12; 

  const graphWidth = availableWidth - paddingLeft - paddingRight;
  const graphHeight = availableHeight - paddingTop - adjustedPaddingBottom;

  // Create a specific clipping frame just for the lines so they don't draw over the X-axis
  const lineClipArea = figma.createFrame();
  lineClipArea.name = "Line Clip Area";
  lineClipArea.layoutMode = "NONE";
  lineClipArea.x = paddingLeft;
  lineClipArea.y = paddingTop;
  lineClipArea.resize(graphWidth, graphHeight);
  lineClipArea.fills = [];
  lineClipArea.clipsContent = true;
  lineClipArea.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  chartArea.appendChild(lineClipArea);

  // Draw Grid & Y-Axis Labels
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const value = niceMin + (range * i) / gridSteps;
    const y = availableHeight - adjustedPaddingBottom - (i / gridSteps) * graphHeight;

    // Grid Line
    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = paddingLeft;
    line.y = y;
    line.strokes = [{ type: 'SOLID', color: hexToRgb('#E6E6E6') }]; // splitLine color
    line.strokeCap = "ROUND";
    line.dashPattern = [4, 4]; // dashed
    line.constraints = { horizontal: "STRETCH", vertical: "SCALE" };
    chartArea.appendChild(line);

    // Label
    const label = figma.createText();
    label.characters = Math.round(value).toString();
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: hexToRgb('#737A87') }]; // yAxis axisLabel color
    label.x = paddingLeft - 48; // Align flush right, leaving 8px gap
    label.y = i === 0 ? y - 12 : y - 6;
    label.resize(40, 12);
    label.textAlignHorizontal = "RIGHT";
    label.constraints = { horizontal: "MIN", vertical: "SCALE" };
    chartArea.appendChild(label);
  }

  // Draw X-Axis Line (bottom)
  const xAxisLine = figma.createLine();
  xAxisLine.resize(graphWidth, 0);
  xAxisLine.x = paddingLeft;
  xAxisLine.y = availableHeight - adjustedPaddingBottom;
  xAxisLine.strokes = [{ type: 'SOLID', color: hexToRgb('#E6E6E6') }]; // xAxis line color
  xAxisLine.constraints = { horizontal: "STRETCH", vertical: "MAX" };
  chartArea.appendChild(xAxisLine);

  // Draw X-Axis Labels
  const stepX = graphWidth / (data.labels.length - 1);
  data.labels.forEach((text: string, i: number) => {
    const x = paddingLeft + i * stepX;
    const label = figma.createText();
    label.characters = text;
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: hexToRgb('#737A87') }]; // xAxis axisLabel color
    label.x = x - 20; // Center align roughly
    label.y = availableHeight - adjustedPaddingBottom; // Set y position to be exactly at the x-axis line (0px gap)
    label.resize(40, 12);
    label.textAlignHorizontal = "CENTER";
    label.constraints = { horizontal: "SCALE", vertical: "MAX" };
    chartArea.appendChild(label);
  });

  // Draw Lines
  data.datasets.forEach((ds: any) => {
    const safeRange = range === 0 ? 1 : range;
    const pathData = ds.data.map((val: number, i: number) => {
      const x = i * stepX;
      const normalizedY = (val - niceMin) / safeRange;
      const y = graphHeight - normalizedY * graphHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const vector = figma.createVector();
    vector.vectorPaths = [{
      windingRule: "NONZERO",
      data: pathData
    }];
    const rgb = hexToRgb(ds.color);
    vector.strokes = [{ type: 'SOLID', color: rgb }];
    vector.strokeWeight = 2; // lineStyle: { width: 2 }
    vector.strokeJoin = "ROUND"; // smooth: true approximation
    vector.strokeCap = "ROUND";
    vector.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    lineClipArea.appendChild(vector);
  });

  // Threshold Line (if selected)
  if (options.type === 'threshold') {
    const thresholdY = availableHeight - adjustedPaddingBottom - 0.8 * graphHeight;
    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = paddingLeft;
    line.y = thresholdY;
    line.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    line.dashPattern = [4, 4];
    line.constraints = { horizontal: "STRETCH", vertical: "SCALE" };
    chartArea.appendChild(line);

    const label = figma.createText();
    label.characters = "Threshold";
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    label.x = availableWidth - paddingRight + 4;
    label.y = thresholdY - 6;
    label.constraints = { horizontal: "MAX", vertical: "SCALE" };
    chartArea.appendChild(label);
  }

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
