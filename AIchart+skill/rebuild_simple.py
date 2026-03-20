import json
import os

def build_simple_code_js():
    # Paths
    ui_src_path = 'src/ui.html'
    code_dist_path = 'dist/code.js'
    manifest_path = 'manifest.json'
    
    # 1. Update manifest.json to remove "ui" field (since we inject HTML)
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        if "ui" in manifest:
            del manifest["ui"]
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2)
            print("Removed 'ui' field from manifest.json")

    # 2. Inject ECharts library directly (avoid CDN/Local file issues)
    with open('src/lib/echarts.min.js', 'r', encoding='utf-8') as f:
        echarts_js = f.read()

    with open(ui_src_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Replace any existing ECharts script tag with inline code
    if '<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js"></script>' in html_content:
        html_content = html_content.replace(
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js"></script>', 
            '<script>' + echarts_js + '</script>'
        )
    elif '<script src="lib/echarts.min.js"></script>' in html_content:
        html_content = html_content.replace(
            '<script src="lib/echarts.min.js"></script>', 
            '<script>' + echarts_js + '</script>'
        )
            
    # JS Logic - USING VAR ONLY to avoid "invalid redefinition" errors in Figma Hot Reload
    js_logic = """
var hexToRgb = function(hex) {
  // console.log("Converting hex:", hex);
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

figma.showUI(_ui_html_content_, { width: 600, height: 1000 });

// Global variable to hold message handler
if (typeof onMessage === 'undefined') {
    var onMessage = async (msg) => {
      // console.log("Received message:", msg.type);
      if (msg.type === 'generate-chart') {
        var { data, options } = msg;
        try {
            await drawChart(data, options);
            console.log("Chart generated successfully");
        } catch (e) {
            console.error("Error generating chart:", e);
            figma.notify("Error generating chart: " + e.message);
        }
      }
    };
    figma.ui.onmessage = onMessage;
} else {
    figma.ui.onmessage = onMessage;
}

var drawChart = async function(data, options) {
  console.log("Starting drawChart V1.2...", options);
  
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

  // Helper for Y-Axis Formatting
  var formatYValue = function(val) {
      if (Math.abs(val) >= 1000000000) {
          return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
      }
      if (Math.abs(val) >= 1000000) {
          return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      }
      if (Math.abs(val) >= 10000) { // Changed threshold from 1000 to 10000
          return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      }
      return Math.round(val).toString();
  };

  var frame;
  var width = 600;
  var height = 300;
  var useSelection = false;

  // Check selection
  if (figma.currentPage.selection.length > 0) {
    var node = figma.currentPage.selection[0];
    if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'GROUP') {
      useSelection = true;
      width = node.width;
      height = node.height;
      
      if (node.type === 'FRAME') {
         frame = node;
         frame.clipsContent = false; // Ensure existing frame doesn't clip labels
         var existing = node.findChild(n => n.name === "AI Chart Container");
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
         
         var parent = node.parent;
         if (parent) {
             parent.insertChild(parent.children.indexOf(node) + 1, frame);
         }
      }
    }
  }

  if (!frame) {
      frame = figma.createFrame();
      frame.name = "AI Chart";
      frame.resize(600, 300);
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      frame.cornerRadius = 8;
      frame.clipsContent = false; // Prevent clipping of labels
      frame.effects = [{
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 10,
        visible: true,
        blendMode: "NORMAL"
      }];
  }

  console.log("Frame created/selected");

  // Ensure frame handles layout correctly or we use constraints
  // We will create a Main Container inside the frame to hold everything
  // This Container will be AutoLayout Vertical
  
  var chartContainer = figma.createFrame();
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
  
  console.log("Container created");

  // 1. Title
   if (options.title && options.title.length > 0) {
       var titleLabel = figma.createText();
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
   
   console.log("Title created (if any)");

    // 2. Chart Body (Holds Plot and Axes)
   // Needs to fill remaining space
   var chartBody = figma.createFrame();
  chartBody.name = "Chart Body";
  chartBody.layoutMode = "VERTICAL"; // AutoLayout Vertical
  chartBody.primaryAxisSizingMode = "AUTO"; // Allow it to grow/shrink
  chartBody.counterAxisSizingMode = "AUTO"; // Fill width
  chartBody.fills = [];
  chartBody.layoutAlign = "STRETCH"; // Fill Width
  chartBody.layoutGrow = 1; // Fill Remaining Height
  chartBody.clipsContent = false; // Prevent clipping
  chartContainer.appendChild(chartBody);
  
  console.log("Chart Body created");

  // Check if it's a bar chart early for Y-axis label formatting
  var isBarChart = options.type === 'bar' || options.barType;
  var barType = isBarChart ? (options.barType || 'simple') : null;
  
  // Calculate Data Range
  var maxVal = -Infinity;
  var minVal = Infinity;
  
  data.datasets.forEach((ds) => {
    ds.data.forEach((v) => {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  // Include Thresholds in Range
  if (options.type === 'threshold' && options.thresholds) {
      options.thresholds.forEach(function(t) {
          var v = parseFloat(t.value);
          if (!isNaN(v)) {
              if (v > maxVal) maxVal = v;
              if (v < minVal) minVal = v;
          }
      });
  }
  
  if (maxVal === -Infinity) maxVal = 100;
  if (minVal === Infinity) minVal = 0;

  var niceMax = Math.ceil(maxVal / 10) * 10;
  var niceMin = Math.floor(minVal / 10) * 10;
  
  if (niceMax === niceMin) {
      niceMax += 10;
      niceMin -= 10;
  }
  
  if (minVal >= 0) niceMin = 0;
  
  // Special handling for stacked bar chart - use percentage range 0-100
  if (isBarChart && barType === 'stacked') {
    niceMin = 0;
    niceMax = 100;
  }
  
  // Adaptive Grid Steps
  var showLegend = data.datasets.length > 0; 
  if (options.legend === false) showLegend = false;

  if (options.type === 'events' || options.type === 'confidence') {
     // For confidence band, only show main series in legend, so it's always single line
     // Unless we are hiding it completely? No, user wants it.
  }
  
  var legendHeight = 0;
  if (showLegend) {
     legendHeight = 20; // Single line default
     // If we have many items and no pager, we might wrap?
     // But new logic uses Pager, so height is fixed 20px (single row).
     // Wait, if totalLegendW > drawW, we show Pager in a single row.
     // So height is consistently 20px.
     // Unless we revert to wrapping? No, user accepted Pager.
  }
  var estimatedHeight = (frame.height - 32) - (options.title ? 30 : 0) - (legendHeight > 0 ? (legendHeight + 8) : 0);
  
  // Adaptive Grid Steps
  // Requirement: Height 240px -> 6 labels (5 intervals). Ratio: 1 interval per ~48px height.
  // Actually usually gridSteps is number of intervals. 5 intervals = 6 lines.
  // Let's target approx 40-50px per interval.
  
  // Requirement: Tighter labels. Reduce target interval height to increase density.
  var targetIntervalHeight = 30; // Reduced from 40 to 30 to allow more grid lines (e.g. 0, 500, 1000, 1500, 2000 instead of 0, 1000, 2000)
  var gridSteps = Math.max(2, Math.floor(estimatedHeight / targetIntervalHeight));
  
  var roughInterval = (niceMax - niceMin) / gridSteps;
  var magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  var normalized = roughInterval / magnitude;
  
  var niceInterval;
  if (normalized < 1.5) niceInterval = 1 * magnitude;
  else if (normalized < 3) niceInterval = 2 * magnitude; 
  else if (normalized < 7) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;
  
  niceMin = Math.floor(niceMin / niceInterval) * niceInterval;
  niceMax = Math.ceil(niceMax / niceInterval) * niceInterval;
  
  if (niceMax === niceMin) niceMax += niceInterval;
  
  gridSteps = Math.round((niceMax - niceMin) / niceInterval);
  
  var range = niceMax - niceMin;

  // Calculate Layout Dimensions
  var tempText = figma.createText();
  tempText.fontSize = 10;
  tempText.fontName = { family: "Inter", style: "Regular" }; 
  tempText.visible = false;
  chartContainer.appendChild(tempText); 
  
  var maxLabelW = 0;
      for (var i = 0; i <= gridSteps; i++) {
          var val = niceMin + (range * i) / gridSteps;
          var txt = formatYValue(val);
          if (options.unit) txt += options.unit;
          tempText.characters = txt;
          if (tempText.width > maxLabelW) maxLabelW = tempText.width;
      }
      tempText.remove();
  
  var plotX = maxLabelW + 4; // Exact width + 4px gap
  var rightMargin = 0; // Reset to 0 as user says current 32px (16 padding + 16 spacer) is too much. 
  // If frame has 16px padding, then 0 spacer means 16px visual margin.
  
   var xAxisHeight = 16; 
   var topMargin = 24; // According to skill spec: grid.top = 24
  // Actually, since Label is centered on y=0 (Grid Line), its top is at -5px (fontSize 10).
  // Title Bottom -> Spacing(8px) -> PlotFrame Top.
  // According to skill spec, grid.top = 24
  
  var topSpacerHeight = 8;
  // Ensure it's not too small if no title
  if (!options.title || options.title.length === 0) topSpacerHeight = 8; 
   
   var topSpacer = figma.createFrame();
   topSpacer.name = "Top Spacer";
   topSpacer.resize(1, Math.max(1, topSpacerHeight)); // Ensure non-zero height if valid
   topSpacer.layoutMode = "NONE";
   topSpacer.layoutAlign = "STRETCH";
   topSpacer.fills = [];
   if (topSpacerHeight > 0) chartBody.appendChild(topSpacer);

   // 3. Plot Frame (Container for Y-Axis Labels + Data Area)
   var plotFrame = figma.createFrame();
   plotFrame.name = "Plot Frame";
   plotFrame.layoutMode = "HORIZONTAL"; 
   plotFrame.itemSpacing = 0;
   plotFrame.fills = [];
   plotFrame.clipsContent = false;
   
   var currentBodyW = (frame.width - 32);
   var chartBodyH = estimatedHeight; 
   var plotH = Math.max(10, chartBodyH - xAxisHeight - topSpacerHeight);
   var fullPlotW = currentBodyW;
   
   plotFrame.resize(fullPlotW, plotH);
   chartBody.appendChild(plotFrame);

   // A. Y-Axis Frame (Fixed Width)
   var yAxisFrame = figma.createFrame();
   yAxisFrame.name = "Y Axis Labels";
   yAxisFrame.layoutMode = "NONE";
   yAxisFrame.resize(plotX, plotH);
   yAxisFrame.layoutSizingHorizontal = "FIXED";
   yAxisFrame.layoutAlign = "STRETCH"; 
   yAxisFrame.fills = [];
   yAxisFrame.clipsContent = false;
   plotFrame.appendChild(yAxisFrame);

   // B. Data Frame (Scaling Width)
   var dataFrame = figma.createFrame();
   dataFrame.name = "Data Area";
   dataFrame.layoutMode = "NONE";
   var drawW = Math.max(0.01, fullPlotW - plotX - rightMargin); // Ensure non-negative width, subtract rightMargin
   dataFrame.resize(drawW, plotH); 
   dataFrame.layoutGrow = 1; 
   dataFrame.layoutAlign = "STRETCH"; 
   dataFrame.fills = [];
   dataFrame.clipsContent = false;
   plotFrame.appendChild(dataFrame);
   
   // C. Right Spacer (New)
   if (rightMargin > 0) {
       var rightSpacer = figma.createFrame();
       rightSpacer.name = "Right Margin";
       rightSpacer.layoutMode = "NONE";
       rightSpacer.resize(rightMargin, plotH);
       rightSpacer.layoutSizingHorizontal = "FIXED";
       rightSpacer.fills = [];
       plotFrame.appendChild(rightSpacer);
   }

   var drawX = 0; // Relative to dataFrame
  
  // Draw Grid & Y-Axis Labels
    var labelColor = hexToRgb('#737A87');
    var labelFontSize = 10;
    
    for (var i = 0; i <= gridSteps; i++) {
        var value = niceMin + (range * i) / gridSteps;
        var normalizedY = (i / gridSteps); 
        var y = plotH - normalizedY * plotH; 

        // 1. Grid Line (in dataFrame)
        var line = figma.createLine();
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

        // 2. Label (in yAxisFrame)
        var label = figma.createText();
        var labelText;
        if (isBarChart && barType === 'stacked') {
          labelText = Math.round(value) + '%';
        } else {
          labelText = formatYValue(value);
          if (options.unit) labelText += options.unit;
        }
        
        label.characters = labelText;
        label.fontSize = labelFontSize;
        label.fills = [{ type: 'SOLID', color: labelColor }];
        
        label.textAutoResize = "WIDTH_AND_HEIGHT"; 
        var naturalWidth = label.width;
        label.textAutoResize = "NONE";
        label.resize(naturalWidth, 12); 
        label.textAlignVertical = "CENTER";
        label.textAlignHorizontal = "RIGHT";
        
        // Y Position Logic:
        // Title Bottom -> Gap(8px) -> Spacer(6px) -> PlotFrame Top.
        // Label Top is at y - 6 (since centered on grid line).
        // For topmost label (y=0), Top is at -6px relative to PlotFrame.
        // Distance from Title Bottom = 8 + 6 + (-6) = 8px.
        // This is exactly what we want.
        
        label.y = y - 6; 
        
        label.constraints = { horizontal: "MAX", vertical: "SCALE" }; 
        yAxisFrame.appendChild(label);
  }

  // Draw X-Axis Labels (Aligned with PlotFrame structure)
  var xAxisFrame = figma.createFrame();
  xAxisFrame.name = "X Axis";
  xAxisFrame.layoutMode = "HORIZONTAL"; 
  xAxisFrame.itemSpacing = 0;
  xAxisFrame.primaryAxisSizingMode = "FIXED"; 
  xAxisFrame.counterAxisSizingMode = "FIXED"; 
  xAxisFrame.resize(fullPlotW, xAxisHeight); 
  xAxisFrame.layoutAlign = "STRETCH"; 
  xAxisFrame.fills = [];
  xAxisFrame.clipsContent = false;
  chartBody.appendChild(xAxisFrame);

  // Spacer to align with Y-Axis Labels
  var xSpacer = figma.createFrame();
  xSpacer.name = "Spacer";
  xSpacer.layoutMode = "NONE";
  xSpacer.resize(plotX, xAxisHeight);
  xSpacer.layoutSizingHorizontal = "FIXED";
  xSpacer.layoutAlign = "STRETCH"; 
  xSpacer.fills = [];
  xAxisFrame.appendChild(xSpacer);

  // Labels Container (Aligns with Data Area)
  var xLabelsContainer = figma.createFrame();
  xLabelsContainer.name = "Labels Container";
  xLabelsContainer.layoutMode = "NONE";
  // Fix: Use exact same width as dataFrame (drawW), NOT full width or something else
  xLabelsContainer.resize(drawW, xAxisHeight);
  xLabelsContainer.layoutGrow = 1; 
  xLabelsContainer.layoutAlign = "STRETCH"; 
  xLabelsContainer.fills = [];
  xLabelsContainer.clipsContent = false;
  xAxisFrame.appendChild(xLabelsContainer);

  var showXLabels = true; // Always show labels unless hidden by logic, but logic below handles it
  if (showXLabels) {
      // 1. Measure all labels
      var labelWidths = [];
      var tempText = figma.createText();
      tempText.fontSize = labelFontSize; 
      try {
          tempText.fontName = { family: "Inter", style: "Regular" };
      } catch(e) {}
      
      data.labels.forEach(l => {
          tempText.characters = l;
          labelWidths.push(tempText.width);
      });
      tempText.remove();
      
      var count = data.labels.length;
      var stepX = drawW / (count - 1); 
      
      // 2. Find best number of labels to show
      // Strategy depends on data type:
      // - Time/Date/Year/Week: Reduce quantity (sparse intervals)
      // - Version/Commit/Region/Category: Rotate labels if space is tight, or truncate.
      
      var isCategorical = false;
      if (options.xAxisType) {
          if (['version', 'commit', 'region', 'category'].indexOf(options.xAxisType) !== -1) {
              isCategorical = true;
          }
      }
      
      // Determine strategy
      var rotateLabels = false;
      var finalIndices = [];
      var finalMaxLabelW = drawW;
      
      if (isCategorical) {
          // STRATEGY: Show ALL labels if possible.
          // If width not enough, ROTATE.
          // If still not enough (even rotated), then maybe reduce? Or just truncate heavily.
          // User requirement: "务必支持看清数据内容" (Must support reading data content) -> Prefer Rotate.
          // "文案太长可以'...'结束" (Truncate if too long)
          
          // Check if all fit horizontally
          var totalWidthNeeded = labelWidths.reduce((a, b) => a + b, 0) + (count - 1) * minGap;
          if (totalWidthNeeded <= drawW) {
              // Fits normally
              finalIndices = Array.from({length: count}, (_, i) => i);
              finalMaxLabelW = stepX - minGap;
          } else {
              // Try Rotation
              rotateLabels = true;
              finalIndices = Array.from({length: count}, (_, i) => i);
              // When rotated, width limit is less strict (height becomes width)
              // But we need to limit text length if it's super long.
              // Let's set a reasonable max width for rotated text (which is vertical height).
              finalMaxLabelW = 100; // Allow up to 100px height for rotated label
              
              // Adjust X-Axis Height to accommodate rotated labels
              xAxisFrame.resize(xAxisFrame.width, 60); // Increase height
              xLabelsContainer.resize(xLabelsContainer.width, 60);
              // Also need to adjust spacers/layout if we change height?
              // The layout logic calculated chartBodyH based on estimatedHeight.
              // We are already inside chart drawing. Resizing frame might push content?
              // ChartBody is AutoLayout? No, ChartBody is Vertical AutoLayout.
              // xAxisFrame is inside ChartBody.
              // If we resize xAxisFrame, ChartBody should grow/shrink if it wraps content?
              // ChartBody.primaryAxisSizingMode is AUTO?
              // Yes: chartBody.layoutMode = "VERTICAL"; chartBody.layoutGrow = 1;
              // Wait, layoutGrow=1 means it fills space.
              // If we increase xAxisFrame height, plotFrame height might need to shrink?
              // plotFrame.resize(fullPlotW, plotH);
              // We should probably re-calculate plotH if we rotate.
              // But simpler is to just let it overflow or expand container if possible.
              // Let's just set rotation and fixed height for now.
          }
      } else {
          // STRATEGY: Time/Date - Reduce Quantity (Sparse)
          // Existing logic for finding best step S
          
          var targetCount = 8; // Default
          if (options.xLabelCount && options.xLabelCount >= 2) {
              targetCount = parseInt(options.xLabelCount);
          } else {
              // Fallback to auto width adaptation
              // User request: "x轴label展示规则应该与y轴展示规则一致，在生成图表时不要展示太拥挤"
              // Y-Axis rule: niceMin/niceMax/niceInterval -> calculated gridSteps.
              // GridSteps is usually 4-6 for height 200-300px.
              // For X-Axis, we have width ~600px.
              // If we want "not too crowded", we should ensure enough space for each label.
              // But also "not too few".
              // Let's aim for a similar "density" or interval.
              // If Y-Axis has 40px interval, X-Axis could have similar visual interval?
              // Or maybe based on label width.
              // Let's use a slightly more conservative targetIntervalWidth (60px) to balance "not too few" and "not crowded".
              // Previous was 72 (too few), then 48 (maybe too crowded?).
              // Let's try 60.
              // User feedback: "In figma 400px canvas, generated x-axis labels are too few".
              // If drawW = 400 - (Y-axis + margin) ~= 350px.
              // 350 / 60 = 5.8 -> 5-6 labels. This is reasonable.
              // If user sees "too few", maybe they see only 2-3?
              // This might happen if 'bestS' search fails and falls back to safeStep (40px).
              // Or if the modulo constraint is too strict.
              
              // Let's relax targetIntervalWidth to 45px to allow more labels.
              // 350 / 45 = 7.7 -> ~8 labels.
              
              // User request: "x轴label最大间距56px"
              // This implies targetIntervalWidth should be at most 56px.
              // So 45px fits. But if we want to be closer to 56px, we can use 56.
              // If target is 56px, then for 350px width: 350/56 = 6.25 labels.
              // Previous 45px gives ~8 labels.
              // User said "generated x-axis labels are too few" before (when it was 60-72).
              // So decreasing interval increases count.
              // If user sets "Max interval 56px", it means "Don't let gaps be larger than 56px".
              // So targetIntervalWidth <= 56.
              // Let's keep 45px as it satisfies <= 56px and provides good density.
              // Or set it to 56px to be safe? 
              // If we set 56, count is fewer. If we set 45, count is more.
              // User might want "more labels" (from previous prompt) but also "max gap 56".
              // Let's stick to 45px as a good default that respects the limit.
              // Actually, let's explicitly set it to 56px to match the specific number requested if it implies a preference.
              // Wait, "Max spacing 56px" -> Spacing <= 56px.
              // If we pick target=56, actual spacing will be around 56.
              // If we pick target=45, actual spacing around 45.
              // 45 <= 56. So 45 is valid.
              // If user meant "Target spacing 56px", then 56.
              // Let's use 50px as a balanced value.
              var targetIntervalWidth = 56; 
              targetCount = Math.max(2, Math.floor(drawW / targetIntervalWidth) + 1);
          }
          
          var minGap = 16; // Increase min gap to prevent crowding (was 6)
          finalIndices = [0, count - 1]; 
          finalMaxLabelW = drawW;
    
          // Find the step 's' that gives a number of labels CLOSEST to targetCount
          // but strictly less than or equal to what fits (collision check).
          
          var bestS = -1;
          var bestCount = 0;
          var bestMaxW = 0;
          
          // Fix: Relaxed loop condition to ensure we find at least one valid configuration
          // The condition `if ((count - 1) % s !== 0) continue;` is too strict.
          // It forces "perfect" intervals where the last label is exactly at the end.
          // While nice, it drastically reduces valid 's' options, often leaving only s=1 (too dense) or s=count-1 (only 2 labels).
          // If we relax this, we can pick every s-th label, and just ensure the last label is always shown (or handled).
          // But standard chart logic usually prefers equal intervals.
          // If (count-1) is prime (e.g. 13 points -> 12 intervals), divisors are only 1, 2, 3, 4, 6, 12.
          // If count is small (e.g. 7 points -> 6 intervals), divisors 1, 2, 3, 6.
          // The issue "only one label" implies bestS was never found or fallback triggered.
          
          // Let's improve the fallback and search.
          
          for (var s = 1; s < count; s++) {
              // Relaxed condition: We don't enforce perfect modulo. 
              // We will just take every s-th label.
              // BUT, to look good, we usually want the last label.
              // If we don't enforce modulo, the last label might be `count-1-remainder`.
              // Standard practice: Force first and last, and pick intermediate. 
              // Or stick to modulo but allow "approximate" counts.
              
              // Let's keep modulo for now but debug why it might fail.
              // If labels are long, limitW < 20 check might filter out good options.
              // If drawW is small, limitW is small.
              
              // Let's try to enforce modulo first.
              if ((count - 1) % s !== 0) continue;
              
              var numLabels = Math.floor((count - 1) / s) + 1;
              var currentStepX = stepX * s;
              var limitW = (currentStepX - minGap); // Allow full space (centered label takes half left/right)
              // Actually, if centered, max width is roughly stepX.
              
              // Relax min width limit to 10px (very short labels like "1")
              if (limitW < 10) continue; 
              
              if (bestS === -1) {
                  bestS = s;
                  bestCount = numLabels;
                  bestMaxW = limitW;
              } else {
                   var currentDiff = Math.abs(numLabels - targetCount);
                   var bestDiff = Math.abs(bestCount - targetCount);
                   
                   if (currentDiff < bestDiff) {
                        // Strictly better match to target
                        bestS = s;
                        bestCount = numLabels;
                        bestMaxW = limitW;
                   } else if (currentDiff === bestDiff) {
                        // Tie-breaker
                        if (numLabels > targetCount) {
                            // Prefer fewer labels if equidistant (less clutter)
                            // If user says "too few", we should prefer MORE labels (numLabels > targetCount)?
                            // No, targetCount is already adjusted up (48px).
                            // Let's stick to proximity.
                            bestS = s;
                            bestCount = numLabels;
                            bestMaxW = limitW;
                        } else {
                            // If current is fewer (s larger), and previous was more.
                            // We are iterating s up (numLabels down).
                            // So current is ALWAYS fewer than previous if different.
                            // If we prefer fewer, we update.
                            // BUT user said "too few labels", so maybe we should prefer MORE?
                            // If distance is equal, prefer the one with MORE labels (smaller s).
                            // Since we iterate s upwards, the FIRST one we found was smaller s (more labels).
                            // So if equal diff, DO NOT update. Keep the previous (more labels).
                            
                            // bestS = s; // DON'T UPDATE
                            // bestCount = numLabels;
                            // bestMaxW = limitW;
                        }
                   }
              }
          }
          
          // Combined Loop Strategy - Optimized for Density & Uniformity
          var minGap = 12; 
          finalIndices = [0, count - 1]; 
          finalMaxLabelW = drawW;
          
          var bestS = -1;
          var bestMaxW = 0;
          
          // Calculate Max Label Width from data
          var maxLW = 0;
          if (labelWidths && labelWidths.length > 0) {
              maxLW = Math.max(...labelWidths);
          }
          
          // Iterate all possible steps to find the smallest s (most labels)
          for (var s = 1; s < count; s++) {
              var currentStepX = stepX * s;
              var limitW = (currentStepX - minGap);
              
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
              var safeStep = Math.ceil(40 / stepX);
              if (safeStep < 1) safeStep = 1;
              bestS = safeStep;
              bestMaxW = stepX * bestS - minGap;
          }
          
          if (bestS !== -1) {
              var indices = [];
              for (var i = 0; i < count; i += bestS) {
                  indices.push(i);
              }
              // Do NOT force last index to ensure strict spatial uniformity
              finalIndices = indices;
              finalMaxLabelW = bestMaxW;
          } else {
              finalIndices = [0, count - 1];
              finalMaxLabelW = Math.max(1, (drawW - minGap) / 2);
          }
      }


      // Render Labels
      finalIndices.forEach((i, index) => {
        var text = data.labels[i];
        var isLast = index === finalIndices.length - 1;
        var isFirst = index === 0;
        
        var x = i * stepX; 
        
        var label = figma.createText();
        label.characters = text;
        label.fontSize = labelFontSize;
        label.fills = [{ type: 'SOLID', color: labelColor }];
        
        // Enable Truncation - Use NONE (Fixed Size) to support single-line truncation
        label.textAutoResize = "NONE"; 
        
        // Attempt to set truncation safely
        try {
            label.textTruncation = "ENDING"; // Ends with ...
        } catch (e) {
            // Fallback for older Figma API versions or if property is not supported
        }
        
        if (rotateLabels) {
            // Rotated Logic (Approx -45 degrees)
            label.rotation = -45;
            
            // Adjust position for rotation
            // Center point of rotation is top-left by default for text?
            // Figma text rotation pivots around top-left.
            // We want the top-right corner of the text to be near the tick mark (x).
            // When rotated -45 deg, the text goes up and right.
            // Let's try aligning center-top to x.
            
            label.textAlignHorizontal = "RIGHT"; // Align right so the end of text is near axis
            label.textAlignVertical = "CENTER";
            
            // For rotated text, we need to be careful with positioning.
            // A simple way is to place it at x, then rotate.
            // If we rotate -45, text goes Up-Right.
            // We want it to go Down-Right? Usually rotated labels are / or \.
            // If labels are long, usually they are rotated 45 (down-right) or 90 (down).
            // Or -45 (up-right) if anchor is bottom-left?
            // Standard chart: Labels are below axis.
            // If we rotate -45, they might point into the chart.
            // We want them to point away.
            // Rotation 45 degrees (clockwise) -> Text goes down-right.
            // Anchor should be Top-Left (start of text) near axis?
            // Or Top-Right (end of text) near axis?
            // If alignment is RIGHT, and we rotate...
            
            // Let's try Rotation = -45 (Counter Clockwise).
            // Text reads from bottom-left to top-right.
            // End of text should be near axis.
            
            label.rotation = -45;
            label.textAlignHorizontal = "RIGHT"; 
            
            // Manually adjust x/y based on rotation
            // x is the center of the interval.
            // We want the text to end near x.
            // With rotation, it's tricky in Figma API without computing bounding box.
            // Let's try a safe bet: Rotation 0 but stagger? No, user asked for tilt.
            // Let's try 45 degrees (Clockwise). Text starts near axis and goes down-right.
            
            label.rotation = 45;
            label.textAlignHorizontal = "LEFT"; // Start of text near axis
            label.x = x; 
            label.y = 5; // Push down slightly
            
            // Constraint width to avoid overlapping next label?
            // When rotated, they are parallel. Overlap happens if vertical distance < text height.
            // They shouldn't overlap if spacing > text height * sin(45).
            // But we should truncate if too long.
            label.resize(100, 20); // Fixed width (becomes diagonal length)
            label.textAutoResize = "NONE"; 
            label.textTruncation = "ENDING";
            
        } else {
            // Standard Horizontal Logic
            if (isFirst) {
                label.textAlignHorizontal = "LEFT";
                label.x = x; 
            } else if (isLast) {
                // Cancel right alignment for last label as requested, use CENTER like middle labels
                label.textAlignHorizontal = "CENTER";
                label.x = x - (finalMaxLabelW / 2);
            } else {
                label.textAlignHorizontal = "CENTER";
                label.x = x - (finalMaxLabelW / 2);
            }
            label.y = 0; 
            
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
  } else {
      // Logic for missing labels in multi-line/threshold mode?
      // Wait, showXLabels was true at start.
      // If it's false, we don't render labels.
      // Why would it be missing?
      // Maybe finalIndices is empty?
      // Or bestS failed?
      // If bestS failed, we fallback to first/last.
      // If drawW is too small, finalMaxLabelW might be huge or tiny.
      // But we have fallback.
      // The issue user reported: "x-axis label missing" for multi-line/threshold.
      // This implies logic broke somewhere.
      // Let's ensure showXLabels is always true unless explicitly hidden.
      // And ensure loop runs.
  }

  // Check if it's a bar chart (already defined earlier)
  if (isBarChart) {
    // Draw Bar Charts
    // barType already defined earlier
    var numDatasets = data.datasets.length;
    var numBars = data.labels.length;
    var barGroupWidth = drawW / numBars;
    
    // 根据skill规范：默认60%相对宽度，类目>10时用12px
    var barWidth;
    if (numBars > 10) {
      barWidth = 12;
    } else {
      barWidth = barGroupWidth * 0.6;
    }
    
    if (barType === 'stacked') {
      // Stacked Bar Chart - Normalized (Percentage)
      var stackHeights = new Array(numBars).fill(0);
      
      var normalizedData = JSON.parse(JSON.stringify(data.datasets));
      
      for (var i = 0; i < numBars; i++) {
        var total = 0;
        for (var j = 0; j < numDatasets; j++) {
          total += data.datasets[j].data[i];
        }
        if (total > 0) {
          for (var j = 0; j < numDatasets; j++) {
            normalizedData[j].data[i] = (data.datasets[j].data[i] / total) * 100;
          }
        }
      }
      
      niceMin = 0;
      niceMax = 100;
      range = niceMax - niceMin;
      
      normalizedData.forEach((ds, datasetIndex) => {
        ds.data.forEach((val, i) => {
          var normalizedY = (val - niceMin) / (range || 1);
          var barHeight = normalizedY * plotH;
          var barCenterX = i * barGroupWidth + barGroupWidth / 2;
          var barX = barCenterX - barWidth / 2;
          var barY = plotH - stackHeights[i] - barHeight;
          
          var rect = figma.createRectangle();
          rect.resize(barWidth, barHeight);
          rect.x = barX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
          
          stackHeights[i] += barHeight;
        });
      });
    } else if (barType === 'grouped' || numDatasets > 1) {
      // Grouped Bar Chart
      var totalGroupWidth;
      if (numBars > 10) {
        totalGroupWidth = 12;
      } else {
        totalGroupWidth = barGroupWidth * 0.6;
      }
      var seriesGap = 2;
      var adjustedBarWidth = (totalGroupWidth - (numDatasets - 1) * seriesGap) / numDatasets;
      
      data.datasets.forEach((ds, datasetIndex) => {
        ds.data.forEach((val, i) => {
          var normalizedY = (val - niceMin) / (range || 1);
          var barHeight = normalizedY * plotH;
          var groupCenterX = i * barGroupWidth + barGroupWidth / 2;
          var groupStartX = groupCenterX - totalGroupWidth / 2;
          var barX = groupStartX + datasetIndex * (adjustedBarWidth + seriesGap);
          var barY = plotH - barHeight;
          
          var rect = figma.createRectangle();
          rect.resize(adjustedBarWidth, barHeight);
          rect.x = barX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    } else if (barType === 'simple' && numDatasets === 1) {
      // Simple Bar Chart
      data.datasets.forEach((ds, datasetIndex) => {
        ds.data.forEach((val, i) => {
          var normalizedY = (val - niceMin) / (range || 1);
          var barHeight = normalizedY * plotH;
          var barCenterX = i * barGroupWidth + barGroupWidth / 2;
          var barX = barCenterX - barWidth / 2;
          var barY = plotH - barHeight;
          
          var rect = figma.createRectangle();
          rect.resize(barWidth, barHeight);
          rect.x = barX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    }
  } else {
    // Draw Lines (Vectors) INSIDE dataFrame
    data.datasets.forEach((ds, datasetIndex) => {
      // Points relative to dataFrame
      var points = ds.data.map((val, i) => {
        var x = i * (drawW / (data.labels.length - 1));
        var normalizedY = (val - niceMin) / (range || 1);
        var y = plotH - normalizedY * plotH; 
        return {x, y};
      });

      var pathData = "";
      var isSmooth = options.lineType === 'smooth' || !options.lineType; 
      if (options.lineType === 'step') isSmooth = false;

    if (points.length > 1) {
        pathData = `M ${points[0].x} ${points[0].y}`;
        
        if (isSmooth) {
           for (var i = 0; i < points.length - 1; i++) {
               var p0 = points[i === 0 ? 0 : i - 1];
               var p1 = points[i];
               var p2 = points[i + 1];
               var p3 = points[i + 2] || p2;
               
               var cp1x = p1.x + (p2.x - p0.x) / 6;
               var cp1y = p1.y + (p2.y - p0.y) / 6;

               var cp2x = p2.x - (p3.x - p1.x) / 6;
               var cp2y = p2.y - (p3.y - p1.y) / 6;

               pathData += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
           }
        } else {
           for (var i = 1; i < points.length; i++) {
               pathData += ` L ${points[i].x} ${points[i].y}`;
           }
        }
    } else if (points.length === 1) {
        pathData = `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }

    var vector = figma.createVector();
    vector.vectorPaths = [{
      windingRule: "NONZERO",
      data: pathData
    }];
    var rgb = hexToRgb(ds.color);
    vector.strokes = [{ type: 'SOLID', color: rgb }];

    var strokeWidth = 2;
    var opacity = 1;
    
    if (options.type === 'key-data' && options.highlightIndices) {
        if (options.highlightIndices.indexOf(datasetIndex) !== -1) {
            strokeWidth = 2;
            opacity = 1;
        } else {
            strokeWidth = 1;
            opacity = 0.3;
        }
    }
    
    if (options.type === 'events' && datasetIndex === 0 && options.confidenceInterval) {
        var percentage = options.confidenceInterval;
        var lowerPoints = ds.data.map((v, i) => {
             var val = v - v * percentage;
             // Clamp value to min/max range to prevent drawing outside
             val = Math.max(niceMin, Math.min(niceMax, val));
             
             var x = i * (drawW / (data.labels.length - 1));
             var y = plotH - ((val - niceMin) / (range || 1)) * plotH;
             return {x, y};
        });
        
        var upperPoints = ds.data.map((v, i) => {
             var val = v + v * percentage;
             // Clamp value
             val = Math.max(niceMin, Math.min(niceMax, val));
             
             var x = i * (drawW / (data.labels.length - 1));
             var y = plotH - ((val - niceMin) / (range || 1)) * plotH;
             return {x, y};
        });
        
        var bandPath = "";
        if (upperPoints.length > 1) {
            // Draw Upper Line (Left to Right)
            bandPath += `M ${upperPoints[0].x} ${upperPoints[0].y}`;
            for (var i = 1; i < upperPoints.length; i++) {
                bandPath += ` L ${upperPoints[i].x} ${upperPoints[i].y}`;
            }
            
            // Draw Lower Line (Right to Left)
            // Connect to the last point of lower line
            bandPath += ` L ${lowerPoints[lowerPoints.length - 1].x} ${lowerPoints[lowerPoints.length - 1].y}`;
            for (var i = lowerPoints.length - 2; i >= 0; i--) {
                bandPath += ` L ${lowerPoints[i].x} ${lowerPoints[i].y}`;
            }
            
            bandPath += " Z";
        }
        
        var bandVector = figma.createVector();
         bandVector.vectorPaths = [{ windingRule: "NONZERO", data: bandPath }];
         bandVector.fills = [{ type: 'SOLID', color: hexToRgb('#1664FF'), opacity: 0.1 }]; 
         bandVector.strokes = [];
        bandVector.constraints = { horizontal: "SCALE", vertical: "SCALE" };
        dataFrame.insertChild(0, bandVector);
    }

    if (options.styles && options.styles[datasetIndex]) {
      var seriesStyle = options.styles[datasetIndex].type;
      if (seriesStyle === 'dashed') vector.dashPattern = [4, 4];
      else if (seriesStyle === 'dotted') vector.dashPattern = [2, 2];
    }
    vector.strokeWeight = strokeWidth;
    vector.opacity = opacity;
    vector.strokeJoin = "ROUND";
    vector.strokeCap = "ROUND";
    vector.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    dataFrame.appendChild(vector);
  });
  }

  // Draw Abnormal Intervals (MarkArea) - only for line charts
  if (!isBarChart && options.type === 'abnormal' && options.abnormalIntervals && options.abnormalIntervals.length > 0) {
      // Sort intervals to ensure correct rendering order if needed, though usually not critical for non-overlapping
      options.abnormalIntervals.forEach(function(inv) {
          var startIndex = -1;
          var endIndex = -1;

          // 0. Try direct index if available
          if (inv.startIndex !== undefined && inv.startIndex !== null) startIndex = parseInt(inv.startIndex);
          if (inv.endIndex !== undefined && inv.endIndex !== null) endIndex = parseInt(inv.endIndex);
          
          // Fallback to string matching if index not valid
          if (startIndex === -1 || isNaN(startIndex) || endIndex === -1 || isNaN(endIndex)) {
              var startLabel = inv.start ? inv.start.toString().trim().toLowerCase() : "";
              var endLabel = inv.end ? inv.end.toString().trim().toLowerCase() : "";
              
              // 1. Try string match
              for (var i = 0; i < data.labels.length; i++) {
                  var l = data.labels[i].toString().trim().toLowerCase();
                  if (startIndex === -1 && l === startLabel) startIndex = i;
                  if (endIndex === -1 && l === endLabel) endIndex = i;
              }
              
              // 2. Try index match if string match failed
              if ((startIndex === -1 || isNaN(startIndex)) && !isNaN(parseInt(startLabel))) {
                 var idx = parseInt(startLabel);
                 if (idx >= 0 && idx < data.labels.length) startIndex = idx;
              }
              if ((endIndex === -1 || isNaN(endIndex)) && !isNaN(parseInt(endLabel))) {
                 var idx = parseInt(endLabel);
                 if (idx >= 0 && idx < data.labels.length) endIndex = idx;
              }
          }
          
          if (startIndex === -1 || endIndex === -1 || isNaN(startIndex) || isNaN(endIndex)) return;
          
          // Ensure start <= end
          if (startIndex > endIndex) {
              var temp = startIndex;
              startIndex = endIndex;
              endIndex = temp;
          }

          var stepX = drawW / (data.labels.length - 1);
          var x1 = startIndex * stepX;
          var x2 = endIndex * stepX;
          
          var width = x2 - x1;
          if (width < 1) width = 1;
          
          // Robust Color Parsing
          var r = 0.96, g = 0.25, b = 0.25, a = 0.1; // Default Red #F53F3F
          
          if (inv.color) {
              if (inv.color.startsWith('#')) {
                  var rgb = hexToRgb(inv.color);
                  r = rgb.r; g = rgb.g; b = rgb.b;
              } else {
                  var colorParts = inv.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                  if (colorParts) {
                      r = parseInt(colorParts[1]) / 255;
                      g = parseInt(colorParts[2]) / 255;
                      b = parseInt(colorParts[3]) / 255;
                      if (colorParts[4]) a = parseFloat(colorParts[4]);
                  }
              }
          }
          
          var intervalFrame = figma.createFrame();
          intervalFrame.name = inv.name || "Interval";
          intervalFrame.layoutMode = "NONE";
          intervalFrame.fills = [];
          intervalFrame.clipsContent = false;
          intervalFrame.x = x1;
          intervalFrame.y = 0;
          intervalFrame.resize(width, plotH);
          intervalFrame.constraints = { horizontal: "SCALE", vertical: "STRETCH" };
          
          var bgRect = figma.createRectangle();
          bgRect.resize(width, plotH); 
          bgRect.x = 0;
          bgRect.y = 0;
          bgRect.fills = [{ type: 'SOLID', color: {r:r, g:g, b:b}, opacity: a }];
          bgRect.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
          intervalFrame.appendChild(bgRect);

          if (inv.name) {
              var label = figma.createText();
              label.characters = inv.name;
              label.fontSize = 12; 
              try {
                  label.fontName = { family: "PingFang SC", style: "Regular" };
              } catch (e) {
                  label.fontName = { family: "Inter", style: "Regular" };
              }
              // Use Grey color for text to match preview and avoid visual clutter
              label.fills = [{ type: 'SOLID', color: hexToRgb('#737A87') }]; 
              label.textAutoResize = "WIDTH_AND_HEIGHT";
              var w = label.width;
              var h = label.height;
              // Center horizontally relative to the interval
              label.x = (intervalFrame.width - w) / 2;
              label.y = -h; // Position above the plot area with 0px spacing
              label.constraints = { horizontal: "CENTER", vertical: "MIN" };
              intervalFrame.appendChild(label);
          }
          
          dataFrame.insertChild(0, intervalFrame);
      });
  }

  // Draw Threshold Lines - only for line charts
  if (!isBarChart && options.type === 'threshold' && options.thresholds && options.thresholds.length > 0) {
      options.thresholds.forEach(function(t) {
          var val = parseFloat(t.value);
          if (isNaN(val) || val < niceMin || val > niceMax) return; 
          
          var normalizedY = (val - niceMin) / (range || 1);
          var y = plotH - normalizedY * plotH;
          
          var line = figma.createLine();
          line.resize(drawW, 0);
          line.x = 0;
          line.y = y;
          
          var color = hexToRgb(t.color || '#F53F3F');
          line.strokes = [{ type: 'SOLID', color: color }];
          line.strokeCap = "ROUND";
          line.dashPattern = [4, 2]; 
          line.strokeWeight = 0.5; 
          line.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(line);
          
          if (t.showLabel !== false) {
              var label = figma.createText();
              label.characters = val.toString();
              label.fontSize = 12; 
              try {
                  label.fontName = { family: "PingFang SC", style: "Medium" };
              } catch (e) {
                  label.fontName = { family: "Inter", style: "Bold" };
              }
              label.fills = [{ type: 'SOLID', color: color }];
              label.textAutoResize = "WIDTH_AND_HEIGHT";
              var h = label.height;
              label.x = 0;
              label.y = y - h - 2; 
              label.constraints = { horizontal: "MIN", vertical: "SCALE" };
              dataFrame.appendChild(label);
          }
      });
  }
  
  // Update plotFrame to fill space
  plotFrame.layoutAlign = "STRETCH";
  plotFrame.layoutGrow = 1;
  
  // Legend
  // Legend Generation
  var showLegend = data.datasets.length > 0;
  if (options.legend === false) showLegend = false;

  if (showLegend) {
      console.log("Generating Legend...");
      
      // 1. Create Main Legend Container
      var legendContainer = figma.createFrame();
      legendContainer.name = "Legend Container";
      legendContainer.layoutMode = "HORIZONTAL";
      legendContainer.primaryAxisSizingMode = "FIXED"; // Fill Width
      legendContainer.layoutAlign = "STRETCH"; 
      legendContainer.counterAxisSizingMode = "AUTO"; 
      legendContainer.primaryAxisAlignItems = "MIN"; // Default Left
      legendContainer.counterAxisAlignItems = "CENTER";
      legendContainer.itemSpacing = 0; 
      legendContainer.fills = [];
      
      // 2. Create Items Wrapper (Left Side)
      var itemsFrame = figma.createFrame();
      itemsFrame.name = "Items";
      itemsFrame.layoutMode = "HORIZONTAL";
      itemsFrame.primaryAxisSizingMode = "AUTO"; // Hug Content
      itemsFrame.counterAxisSizingMode = "AUTO"; 
      itemsFrame.itemSpacing = 12; // Adjusted to 12px
      itemsFrame.fills = [];
      
      // Calculate Widths
      var tempText = figma.createText();
      tempText.fontSize = labelFontSize;
      try { tempText.fontName = { family: "Inter", style: "Regular" }; } catch(e) {}
      
      var itemWidths = [];
      var totalLegendW = 0;
      var gap = 12; // Adjusted to 12px
      
      data.datasets.forEach((ds, i) => {
          var cleanName = (ds.name || `Series ${i+1}`).replace(/[\u200B-\u200D\uFEFF]/g, '');
          tempText.characters = cleanName;
          var w = 18 + 8 + tempText.width; 
          itemWidths.push(w);
          totalLegendW += w;
      });
      totalLegendW += (data.datasets.length - 1) * gap;
      tempText.remove(); 
      
      // Pagination Logic
      var showPager = false;
      var visibleCount = data.datasets.length;
      var pagerW = 60; 
      
      if (totalLegendW > drawW) {
          showPager = true;
          // Switch to SPACE_BETWEEN if pager is shown to push it to right
          legendContainer.primaryAxisAlignItems = "SPACE_BETWEEN"; 
          
          var availW = drawW - pagerW - gap; 
          var currentW = 0;
          visibleCount = 0;
          for (var i = 0; i < itemWidths.length; i++) {
              if (currentW + itemWidths[i] <= availW) {
                  currentW += itemWidths[i] + gap;
                  visibleCount++;
              } else {
                  break;
              }
          }
          if (visibleCount === 0) visibleCount = 1; 
      }
      
      // Render Items
      for (var k = 0; k < visibleCount; k++) {
        var ds = data.datasets[k];
        
        var item = figma.createFrame();
        item.layoutMode = "HORIZONTAL";
        item.counterAxisSizingMode = "FIXED"; 
        item.primaryAxisSizingMode = "AUTO";  
        item.counterAxisAlignItems = "CENTER"; 
        item.itemSpacing = 8;
        item.resize(100, 18); 
        item.fills = [];
    
        var iconFrame = figma.createFrame();
        iconFrame.resize(8, 8); 
        iconFrame.fills = [];
        iconFrame.clipsContent = false;
        
        // 根据skill规范：统一使用矩形图标，尺寸8x8
        var rect = figma.createRectangle();
        rect.resize(8, 8);
        rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
        rect.x = 0;
        rect.y = 0;
        iconFrame.appendChild(rect);
        
        item.appendChild(iconFrame);
        
        // Label
        var label = figma.createText();
        var cleanName = (ds.name || `Series ${k+1}`).replace(/[\u200B-\u200D\uFEFF]/g, '');
        if (!cleanName) cleanName = `Series ${k+1}`;
        label.characters = cleanName; 
        label.fontSize = 10;
        try { label.fontName = { family: "Inter", style: "Regular" }; } catch(e) {}
        label.fills = [{ type: 'SOLID', color: {r: 0.45, g: 0.48, b: 0.53} }]; // #737A87
        item.appendChild(label);
        
        itemsFrame.appendChild(item);
      }
      legendContainer.appendChild(itemsFrame);
      
      // Render Pager
      if (showPager) {
          var totalPages = Math.ceil(totalLegendW / drawW);
          if (totalPages < 2) totalPages = 2; 
          
          var pager = figma.createFrame();
          pager.name = "Pager";
          pager.layoutMode = "HORIZONTAL";
          pager.counterAxisAlignItems = "CENTER";
          pager.itemSpacing = 4;
          pager.fills = [];
          pager.resize(pagerW, 18); 
          
          var prev = figma.createText();
          prev.characters = "<";
          prev.fontSize = 10;
          prev.fills = [{ type: 'SOLID', color: hexToRgb('#86909C') }]; 
          pager.appendChild(prev);
          
          var pageInfo = figma.createText();
          pageInfo.characters = `1 / ${totalPages}`;
          pageInfo.fontSize = 10;
          pageInfo.fills = [{ type: 'SOLID', color: hexToRgb('#4E5969') }]; 
          pager.appendChild(pageInfo);
          
          var next = figma.createText();
          next.characters = ">";
          next.fontSize = 10;
          next.fills = [{ type: 'SOLID', color: hexToRgb('#1D2129') }]; 
          pager.appendChild(next);
          
          legendContainer.appendChild(pager);
      }
      
      chartContainer.appendChild(legendContainer);
      console.log("Legend appended");
  }

  // Removed "Generate Chart" button creation as requested
  /*
  // Create Button 24px below the Chart
  var buttonFrame = figma.createFrame();
  ...
  chartContainer.appendChild(buttonFrame);
  */

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}
"""

    html_string = json.dumps(html_content)
    # Wrap in IIFE to avoid global scope pollution and redefinition errors
    # Use var for _ui_html_content_ to avoid const redefinition errors even in IIFE (if context persists)
    # Important: Ensure the injected logic is properly escaped for the JS string if needed, 
    # but here we are concatenating raw JS code, which is fine.
    
    # CRITICAL FIX: The figma.ui.onmessage handler must be registered at the top level of the plugin execution context,
    # or at least guaranteed to run. The previous IIFE structure is good.
    # However, let's make sure the async/await logic is robust.
    
    new_js_content = "(() => {\nvar _ui_html_content_ = " + html_string + ";\n" + js_logic + "\n})();"
    
    with open(code_dist_path, 'w', encoding='utf-8') as f:
        f.write(new_js_content)
        
    print(f"Successfully rebuilt {code_dist_path} with CDN-based HTML")

if __name__ == "__main__":
    build_simple_code_js()
