/**
 * Chart rendering functions extracted from code.ts
 */

function centerNodeInViewport(node: SceneNode): void {
  const width = typeof (node as any).width === 'number' ? (node as any).width : 0;
  const height = typeof (node as any).height === 'number' ? (node as any).height : 0;
  node.x = figma.viewport.center.x - width / 2;
  node.y = figma.viewport.center.y - height / 2;
}

function formatYValue(val: number): string {
  if (Math.abs(val) >= 1000000000) {
    return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (Math.abs(val) >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(val) >= 10000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return Math.round(val).toString();
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

export async function drawAiChart(data: any, options: any) {
  // Validate input
  if (!data || !data.datasets) {
    console.error("Invalid data provided");
    figma.notify("Invalid data");
    return;
  }

  // Load fonts - Critical Step
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch (e) {
    console.error("Failed to load Inter font", e);
    figma.notify("Failed to load standard fonts");
    return;
  }
  
  // Load PingFang SC Medium for Title (Optional)
  try {
    await figma.loadFontAsync({ family: "PingFang SC", style: "Medium" });
  } catch (e) {
    console.log("PingFang SC Medium not available, falling back");
  }
  try {
    await figma.loadFontAsync({ family: "PingFang SC", style: "Regular" });
  } catch (e) {
    console.log("PingFang SC Regular not available, falling back");
  }

  let frame: FrameNode | null = null;
  let width = 360;
  let height = 180;
  let useSelection = false;

  // Check selection - support RECTANGLE, FRAME, GROUP
  if (figma.currentPage.selection.length > 0) {
    const node = figma.currentPage.selection[0];
    if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'GROUP') {
      useSelection = true;
      width = node.width;
      height = node.height;
      
      if (node.type === 'FRAME') {
        frame = node;
        frame.clipsContent = false; // Ensure existing frame doesn't clip labels
        const existing = node.findChild((n: SceneNode) => n.name === "AI Chart Container");
        if (existing) existing.remove();
      } else {
        frame = figma.createFrame();
        frame.x = node.x;
        frame.y = node.y;
        frame.resize(width, height);
        frame.name = "AI Chart";
        
        if (node.type === 'RECTANGLE' && node.fills) {
          frame.fills = node.fills;
        } else {
          frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        }
        
        const parent = node.parent;
        if (parent) {
          parent.insertChild(parent.children.indexOf(node) + 1, frame);
        }
      }
    }
  }

  if (!frame) {
    frame = figma.createFrame();
    frame.name = "AI Chart";
    frame.resize(width, height);
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    frame.cornerRadius = 8;
    frame.clipsContent = false; // Prevent clipping of labels
    
    // Set stroke color to #EAEDF1
    frame.strokes = [{ type: 'SOLID', color: hexToRgb('#EAEDF1') }];
    frame.strokeWeight = 1;
    
    // Remove drop shadow by keeping effects empty
    frame.effects = [];
    
    centerNodeInViewport(frame);
  }

  // Create AI Chart Container inside the frame
  const chartContainer = figma.createFrame();
  chartContainer.name = "AI Chart Container";
  chartContainer.layoutMode = "VERTICAL";
  chartContainer.primaryAxisSizingMode = "AUTO"; 
  chartContainer.clipsContent = false; // Prevent clipping
  
  // Set Padding on Chart Container to ensure internal spacing
  chartContainer.paddingLeft = 16;
  chartContainer.paddingRight = 16;
  chartContainer.paddingTop = 16;
  chartContainer.paddingBottom = 16;

  // If frame is AutoLayout:
  if (frame.layoutMode !== "NONE") {
    chartContainer.layoutAlign = "STRETCH";
    chartContainer.layoutGrow = 1;
  } else {
    // Frame is FIXED/NONE. Use Constraints.
    chartContainer.resize(frame.width, frame.height); // Fill completely
    chartContainer.x = 0;
    chartContainer.y = 0;
    chartContainer.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  }
  
  chartContainer.fills = [];
  chartContainer.itemSpacing = 8; // Default spacing between items
  frame.appendChild(chartContainer);

  // 1. Title
  if (options.title && options.title.length > 0) {
    const titleLabel = figma.createText();
    titleLabel.characters = options.title;
    titleLabel.fontSize = 14;
    try {
      titleLabel.fontName = { family: "PingFang SC", style: "Medium" };
    } catch (e) {
      titleLabel.fontName = { family: "Inter", style: "Bold" };
    }
    titleLabel.fills = [{ type: 'SOLID', color: hexToRgb('#0C0D0E') }];
    chartContainer.appendChild(titleLabel);
  }

  // 2. Chart Body (Holds Plot and Axes)
  const chartBody = figma.createFrame();
  chartBody.name = "Chart Body";
  chartBody.layoutMode = "VERTICAL"; // AutoLayout Vertical
  chartBody.primaryAxisSizingMode = "AUTO"; // Allow it to grow/shrink
  chartBody.counterAxisSizingMode = "AUTO"; // Fill width
  chartBody.fills = [];
  chartBody.layoutAlign = "STRETCH"; // Fill Width
  chartBody.layoutGrow = 1; // Fill Remaining Height
  chartBody.clipsContent = false; // Prevent clipping
  chartContainer.appendChild(chartBody);
  
  // Calculate Data Range
  let maxVal = -Infinity;
  let minVal = Infinity;
  
  data.datasets.forEach((ds: any) => {
    ds.data.forEach((v: number) => {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  if (maxVal === -Infinity) maxVal = 100;
  if (minVal === Infinity) minVal = 0;

  let niceMax = Math.ceil(maxVal / 10) * 10;
  let niceMin = Math.floor(minVal / 10) * 10;
  
  if (niceMax === niceMin) {
    niceMax += 10;
    niceMin -= 10;
  }
  
  if (minVal >= 0) niceMin = 0;
  
  // Adaptive Grid Steps
  const showLegend = data.datasets.length > 0; 
  const legendHeight = showLegend ? 20 : 0;
  const hasTitle = options.title && options.title.length > 0;
  const estimatedHeight = (height - 32) - (hasTitle ? 30 : 0) - (legendHeight > 0 ? (legendHeight + 8) : 0);
  
  // Adaptive Grid Steps
  const targetIntervalHeight = 30;
  let gridSteps = Math.max(2, Math.floor(estimatedHeight / targetIntervalHeight));
  
  let roughInterval = (niceMax - niceMin) / gridSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalized = roughInterval / magnitude;
  
  let niceInterval: number;
  if (normalized < 1.5) niceInterval = 1 * magnitude;
  else if (normalized < 3) niceInterval = 2 * magnitude; 
  else if (normalized < 7) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;
  
  niceMin = Math.floor(niceMin / niceInterval) * niceInterval;
  niceMax = Math.ceil(niceMax / niceInterval) * niceInterval;
  
  if (niceMax === niceMin) niceMax += niceInterval;
  
  gridSteps = Math.round((niceMax - niceMin) / niceInterval);
  
  const range = niceMax - niceMin;

  // Calculate Layout Dimensions
  const tempText = figma.createText();
  tempText.fontSize = 10;
  tempText.fontName = { family: "Inter", style: "Regular" }; 
  tempText.visible = false;
  chartContainer.appendChild(tempText); 
  
  let maxLabelW = 0;
  for (let i = 0; i <= gridSteps; i++) {
    const val = niceMin + (range * i) / gridSteps;
    let txt = formatYValue(val);
    if (options.unit) txt += options.unit;
    tempText.characters = txt;
    if (tempText.width > maxLabelW) maxLabelW = tempText.width;
  }
  tempText.remove();
  
  const plotX = maxLabelW + 8; // 8px gap between label and axis line
  const rightMargin = 0; 
  const xAxisHeight = 16; 
  const topSpacerHeight = hasTitle ? 6 : 0;

  // Top Spacer
  if (topSpacerHeight > 0) {
    const topSpacer = figma.createFrame();
    topSpacer.name = "Top Spacer";
    topSpacer.resize(1, topSpacerHeight);
    topSpacer.layoutMode = "NONE";
    topSpacer.layoutAlign = "STRETCH";
    topSpacer.fills = [];
    chartBody.appendChild(topSpacer);
  }

  // Plot Frame
  const plotFrame = figma.createFrame();
  plotFrame.name = "Plot Frame";
  plotFrame.layoutMode = "HORIZONTAL"; 
  plotFrame.itemSpacing = 0;
  plotFrame.fills = [];
  plotFrame.clipsContent = false;
  plotFrame.layoutAlign = "STRETCH";
  plotFrame.layoutGrow = 1;
  
  const currentBodyW = width - 32;
  const chartBodyH = estimatedHeight; 
  const plotH = Math.max(10, chartBodyH - xAxisHeight - topSpacerHeight);
  const fullPlotW = currentBodyW;
  
  plotFrame.resize(fullPlotW, plotH);
  chartBody.appendChild(plotFrame);

  // Y-Axis Frame
  const yAxisFrame = figma.createFrame();
  yAxisFrame.name = "Y Axis Labels";
  yAxisFrame.layoutMode = "NONE";
  yAxisFrame.resize(plotX, plotH);
  yAxisFrame.layoutSizingHorizontal = "FIXED";
  yAxisFrame.layoutAlign = "STRETCH"; 
  yAxisFrame.fills = [];
  yAxisFrame.clipsContent = false;
  plotFrame.appendChild(yAxisFrame);

  // Data Frame
  const dataFrame = figma.createFrame();
  dataFrame.name = "Data Area";
  dataFrame.layoutMode = "NONE";
  const drawW = Math.max(0.01, fullPlotW - plotX - rightMargin);
  dataFrame.resize(drawW, plotH); 
  dataFrame.layoutGrow = 1; 
  dataFrame.layoutAlign = "STRETCH"; 
  dataFrame.fills = [];
  dataFrame.clipsContent = false;
  plotFrame.appendChild(dataFrame);

  // Draw Grid & Y-Axis Labels
  const labelColor = hexToRgb('#737A87');
  const labelFontSize = 10;
  
  for (let i = 0; i <= gridSteps; i++) {
    const value = niceMin + (range * i) / gridSteps;
    const normalizedY = (i / gridSteps); 
    const y = plotH - normalizedY * plotH;

    // Grid Line
    const line = figma.createLine();
    line.resize(drawW, 0);
    line.x = 0;
    line.y = y;
    
    if (i === 0) {
      line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; 
      line.strokeCap = "ROUND";
    } else {
      line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      line.strokeCap = "ROUND";
      line.dashPattern = [2, 2];
    }
    
    line.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    dataFrame.appendChild(line);

    // Label
    const label = figma.createText();
    let labelText = formatYValue(value);
    if (options.unit) labelText += options.unit;
    
    label.characters = labelText;
    label.fontSize = labelFontSize;
    label.fills = [{ type: 'SOLID', color: labelColor }];
    
    label.textAutoResize = "WIDTH_AND_HEIGHT"; 
    const naturalWidth = label.width;
    label.textAutoResize = "NONE";
    label.resize(naturalWidth, 12); 
    label.textAlignVertical = "CENTER";
    label.textAlignHorizontal = "RIGHT";
    // Adjust the x coordinate to have an 8px gap with the grid line (which starts at plotX)
    label.x = plotX - naturalWidth - 8; 
    
    // Adjust y position specifically for the 0 label (i === 0) to align with X-axis label top
    // For i === 0, the grid line is exactly at y = plotH.
    // X-axis label's y in the parent is plotH + 4 (from xAxisFrame placement).
    // The previous logic y - 6 centered it on the line.
    // To make "0Tb/s" sit exactly 0px above the X-axis label (which visually means its bottom edge touches the top edge of the X-axis label text or the X-axis line), we set its y coordinate.
    // If we want its bottom to align with the X-axis line (which is at y = plotH), and the label height is 12:
    label.y = i === 0 ? y - 12 : y - 6; 
    
    label.constraints = { horizontal: "MAX", vertical: "SCALE" }; 
    yAxisFrame.appendChild(label);
  }

  // X-Axis Frame
  const xAxisFrame = figma.createFrame();
  xAxisFrame.name = "X Axis";
  xAxisFrame.layoutMode = "NONE"; 
  xAxisFrame.primaryAxisSizingMode = "FIXED"; 
  xAxisFrame.counterAxisSizingMode = "FIXED"; 
  xAxisFrame.resize(fullPlotW, xAxisHeight); 
  xAxisFrame.layoutAlign = "STRETCH"; 
  xAxisFrame.fills = [];
  xAxisFrame.clipsContent = false;
  chartBody.appendChild(xAxisFrame);

  // Add the solid X-Axis Line explicitly at the top of xAxisFrame to act as the boundary
  const xAxisLine = figma.createLine();
  xAxisLine.name = "X Axis Line";
  xAxisLine.resize(fullPlotW, 0);
  xAxisLine.x = 0;
  xAxisLine.y = 0;
  // Make the line transparent to "remove" it visually while keeping the layout structure
  xAxisLine.strokes = [{ type: 'SOLID', color: hexToRgb('#E6E6E6'), opacity: 0 }];
  xAxisFrame.appendChild(xAxisLine);

  // X Labels Container
  const xLabelsContainer = figma.createFrame();
  xLabelsContainer.name = "Labels Container";
  xLabelsContainer.layoutMode = "NONE";
  xLabelsContainer.resize(drawW, xAxisHeight);
  xLabelsContainer.x = plotX; // Shift container to the right by plotX (yAxis width)
  xLabelsContainer.y = 0;
  xLabelsContainer.fills = [];
  xLabelsContainer.clipsContent = false;
  xAxisFrame.appendChild(xLabelsContainer);

  const count = data.labels.length;
  const isBarChart = options.type === 'bar';
  
  // Normalize Y values carefully
  const safeRange = range === 0 ? 1 : range;

  
  // 根据图表类型选择不同的X轴标签布局
  let labelPositions: number[] = [];
  
  let stepX = count > 1 ? drawW / (count - 1) : drawW;
  if (isBarChart) {
    // 柱状图：使用boundaryGap=true的布局
    const barCategoryGap = 0.3;
    const categorySlotWidth = count > 0 ? drawW / (count + barCategoryGap) : drawW;

    for (let i = 0; i < count; i++) {
      const centerX = categorySlotWidth / 2 + i * categorySlotWidth;
      labelPositions.push(centerX);
    }
  } else {
    // 折线图：使用原有的等距布局
    stepX = count > 1 ? drawW / (count - 1) : drawW;
    for (let i = 0; i < count; i++) {
      labelPositions.push(count === 1 ? drawW / 2 : i * stepX);
    }
  }

  // Draw X-Axis Labels (Aligned with PlotFrame structure)
  const showXLabels = true; 
  if (showXLabels) {
    // 1. Measure all labels
    const labelWidths: number[] = [];
    const tempText = figma.createText();
    tempText.fontSize = labelFontSize; 
    try {
      tempText.fontName = { family: "Inter", style: "Regular" };
    } catch(e) {}
    
    data.labels.forEach((l: string) => {
      tempText.characters = l;
      labelWidths.push(tempText.width);
    });
    tempText.remove(); 
    
    // 2. Find best number of labels to show
    const isCategorical = false;
    
    const rotateLabels = false;
    let finalIndices: number[] = [];
    let finalMaxLabelW = drawW;
    
    // Combined Loop Strategy - Optimized for Density & Uniformity
    const minGap = 12; 
    finalIndices = [0, count - 1]; 
    finalMaxLabelW = drawW;
    
    let bestS = -1;
    let bestMaxW = 0;
    
    // Calculate Max Label Width from data
    let maxLW = 0;
    if (labelWidths && labelWidths.length > 0) {
      maxLW = Math.max(...labelWidths);
    }
    
    // Iterate all possible steps to find the smallest s (most labels)
    for (let s = 1; s < count; s++) {
      // 计算步长间距
      let currentStepDistance = 0;
      if (labelPositions.length > 1) {
        const stepIndex = Math.min(s, labelPositions.length - 1);
        currentStepDistance = Math.abs(labelPositions[stepIndex] - labelPositions[0]);
      }
      
      const limitW = (currentStepDistance > 0 ? currentStepDistance : drawW) - minGap;
      
      // 1. Strict Width Constraint (36px)
      if (limitW < 36) continue;
      
      // 2. Check against actual label width to avoid overlap (with 20% tolerance)
      if (maxLW > 0 && limitW < maxLW * 0.8) continue; 
      
      // Found the smallest valid s (since we iterate up)
      bestS = s;
      bestMaxW = limitW;
      break; 
    }
    
    // Fallback if nothing fits
    if (bestS === -1) {
      // Force a step that gives ~40px
      bestS = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(drawW / 40))));
      bestMaxW = Math.max(36, drawW / Math.max(1, count / bestS) - minGap);
    }
    
    if (bestS !== -1) {
      const indices: number[] = [];
      for (let i = 0; i < count; i += bestS) {
        indices.push(i);
      }
      // Do NOT force last index to ensure strict spatial uniformity
      finalIndices = indices;
      finalMaxLabelW = bestMaxW;
    } else {
      finalIndices = [0, count - 1];
      finalMaxLabelW = Math.max(1, (drawW - minGap) / 2);
    }

    // Render Labels
    finalIndices.forEach((i: number, index: number) => {
      const text = data.labels[i];
      const isLast = index === finalIndices.length - 1;
      const isFirst = index === 0;
      
      const x = labelPositions[i];
      
      const label = figma.createText();
      label.characters = text;
      label.fontSize = labelFontSize;
      label.fills = [{ type: 'SOLID', color: labelColor }];
      
      // Enable Truncation - Use NONE (Fixed Size) to support single-line truncation
      label.textAutoResize = "NONE"; 
      
      // Attempt to set truncation safely
      try {
        (label as any).textTruncation = "ENDING"; // Ends with ...
      } catch (e) {
        // Fallback for older Figma API versions or if property is not supported
      }
      
      if (rotateLabels) {
        // Rotated Logic - not used in default mode
      } else {
        // Standard Horizontal Logic - 所有标签都居中对齐
        label.textAlignHorizontal = "CENTER";
        label.x = x - (finalMaxLabelW / 2);
        // Set y to be close to the axis line (gap of 4px instead of 8px)
        label.y = 4; 
        
        // Set width to strict limit to ensure no collision
        if (finalMaxLabelW > 0.01) {
          label.resize(finalMaxLabelW, label.height); 
        } else {
          label.resize(0.01, label.height);
        }
      }
      
      label.constraints = { horizontal: "SCALE", vertical: "MIN" };
      
      xLabelsContainer.appendChild(label);
    });
  }

  // Draw Chart Data (Lines or Bars)
  const barType = options.barType || 'simple';
  
  if (isBarChart) {
    // 绘制柱状图 - 严格遵循SKILL规范
    const numCategories = data.labels.length;
    const numSeries = data.datasets.length;
    
    // SKILL规范配置
    const barCategoryGap = 0.3; // 30%
    const barGap = barType === 'grouped' ? 0.2 : 0; // 分组时20%，其他0%
    const barWidthPercent = numCategories > 10 ? 0.5 : 0.7; // >10类目50%，否则70%
    
    // 使用boundaryGap=true的布局：两端各留半个类目宽度的空间
    const totalCategoriesWidth = drawW;
    // 计算每个类目的可用宽度（包含barCategoryGap）
    const categorySlotWidth = numCategories > 0 ? totalCategoriesWidth / (numCategories + barCategoryGap) : totalCategoriesWidth;
    // 计算柱子实际占用的宽度（不包含barCategoryGap）
    const categoryUsableWidth = categorySlotWidth * (1 - barCategoryGap);
    
    if (barType === 'simple') {
      // 基础柱状图
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          // Calculate height from 0 instead of niceMin to ensure proper rendering within bounds
          const normalizedY = Math.max(0, (val - Math.max(0, niceMin)) / safeRange);
          const barHeight = Math.max(0.1, normalizedY * plotH); // Ensure at least 0.1px height to be visible
          const barY = Math.max(0, plotH - barHeight);
          
          // 计算柱子中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 柱子宽度
          const barW = categoryUsableWidth * barWidthPercent;
          const barX = categoryCenterX - barW / 2;
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - barW));
          
          const rect = figma.createRectangle();
          rect.resize(barW, barHeight);
          rect.x = safeBarX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    } else if (barType === 'grouped') {
      // 分组柱状图
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          // Calculate height from 0 instead of niceMin to ensure proper rendering within bounds
          const normalizedY = Math.max(0, (val - Math.max(0, niceMin)) / safeRange);
          const barHeight = Math.max(0.1, normalizedY * plotH);
          const barY = Math.max(0, plotH - barHeight);
          
          // 计算分组中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 分组内所有柱子的总宽度（包含间距）
          const groupTotalWidth = categoryUsableWidth;
          // 分组内柱子间距总宽度
          const totalGapInGroup = (numSeries - 1) * groupTotalWidth * barGap;
          // 单根柱子宽度
          const singleBarWidth = (groupTotalWidth - totalGapInGroup) / numSeries;
          // 分组起始位置
          const groupStartX = categoryCenterX - groupTotalWidth / 2;
          // 当前柱子位置
          const barX = groupStartX + seriesIndex * (singleBarWidth + groupTotalWidth * barGap);
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - singleBarWidth));
          
          const rect = figma.createRectangle();
          rect.resize(singleBarWidth, barHeight);
          rect.x = safeBarX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    } else if (barType === 'stacked') {
      // 堆叠柱状图
      // 先计算每个位置的累积值
      const stackedValues: number[][] = [];
      for (let i = 0; i < numCategories; i++) {
        stackedValues[i] = [];
        let cumulative = 0;
        for (let j = 0; j < numSeries; j++) {
          stackedValues[i][j] = cumulative;
          cumulative += data.datasets[j].data[i];
        }
      }
      
      // 找到所有数据的最大值和最小值来正确缩放
      let allMin = Infinity;
      let allMax = -Infinity;
      data.datasets.forEach((ds: any) => {
        ds.data.forEach((v: number) => {
          if (v < allMin) allMin = v;
          if (v > allMax) allMax = v;
        });
      });
      
      // 计算每个位置的总累积值
      const totalStacked: number[] = [];
      for (let i = 0; i < numCategories; i++) {
        let total = 0;
        for (let j = 0; j < numSeries; j++) {
          total += data.datasets[j].data[i];
        }
        totalStacked[i] = total;
        if (total > allMax) allMax = total;
      }
      
      if (allMin === Infinity) allMin = 0;
      if (allMax === -Infinity) allMax = 100;
      if (allMin >= 0) allMin = 0;
      
      const stackedRange = allMax - allMin || 1;
      
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          const baseValue = stackedValues[i][seriesIndex];
          const normalizedBase = Math.max(0, (baseValue - Math.max(0, allMin)) / stackedRange);
          const normalizedTop = Math.max(0, (baseValue + val - Math.max(0, allMin)) / stackedRange);
          
          const barHeight = Math.max(0.1, (normalizedTop - normalizedBase) * plotH);
          const barY = Math.max(0, plotH - normalizedTop * plotH);
          
          // 计算柱子中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 柱子宽度
          const barW = categoryUsableWidth * barWidthPercent;
          const barX = categoryCenterX - barW / 2;
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - barW));
          
          if (barHeight > 0.1) {
            const rect = figma.createRectangle();
            rect.resize(barW, barHeight);
            rect.x = safeBarX;
            rect.y = barY;
            rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
            rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
            dataFrame.appendChild(rect);
          }
        });
      });
    }
  } else {
    // 绘制折线图（保持原有逻辑）
    data.datasets.forEach((ds: any) => {
      const pathData = ds.data.map((val: number, i: number) => {
        const x = i * stepX;
        // Clamp normalizedY to avoid exceeding drawing bounds
        const normalizedY = Math.max(0, Math.min(1, (val - niceMin) / safeRange));
        const y = Math.max(0, plotH - normalizedY * plotH);
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
      vector.constraints = { horizontal: "SCALE", vertical: "SCALE" };
      dataFrame.appendChild(vector);
    });
  }

  // Legend Area
  if (showLegend) {
    const legendFrame = figma.createFrame();
    legendFrame.layoutMode = "HORIZONTAL";
    legendFrame.counterAxisSizingMode = "AUTO";
    legendFrame.itemSpacing = 16;
    legendFrame.layoutAlign = "STRETCH";
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
      label.characters = ds.name || `Series ${i+1}`;
      label.fontSize = 12;
      label.fills = [{ type: 'SOLID', color: labelColor }];
      item.appendChild(label);

      legendFrame.appendChild(item);
    });
    chartContainer.appendChild(legendFrame);
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}
