# 合并单元格表格验收清单

本文档用于 `P0-6` 的人工验收与回归检查，配套样例为：

- `docs/for-humans/testing/case-1-single-group-merge.json`
- `docs/for-humans/testing/case-2-multi-group-merge.json`

参考截图：

- [情况1 screenshot_10_10691.png](file:///Users/bytedance/VEDUIAgent/.figma/image/screenshot_10_10691.png)
- [情况2 screenshot_10_9937.png](file:///Users/bytedance/VEDUIAgent/.figma/image/screenshot_10_9937.png)

## 验收范围

- 新建表格时可正确解析 `headerRows + rows + merges`
- 支持 `Header Colspan`
- 支持 `Header Rowspan`
- 支持 `Body Rowspan`
- 普通无 merge 表格不回归

## 样例 A

- 样例文件：`case-1-single-group-merge.json`
- 目标结构：
  - `在线计算` 为单个一级分组表头，横向合并 6 列
  - `业务`、`VRegion`、`ID` 跨两层表头
  - `业务`、`ID` 在表体中做纵向合并
- 验收点：
  - 表头总层数为 2
  - `在线计算` 水平居中
  - `业务`、`VRegion`、`ID` 高度为两层表头高度之和
  - `推荐`、`广告`、`生活服务` 的纵向合并高度分别为 `2 / 2 / 3` 行
  - `ID` 列纵向合并与业务列一致
  - 默认只保留横向分割线，不额外显示组间竖线
  - 合并单元格与普通单元格使用相同边框颜色

## 样例 B

- 样例文件：`case-2-multi-group-merge.json`
- 目标结构：
  - `在线计算` 横向合并 6 列
  - `在线队列` 横向合并 6 列
  - `业务`、`VRegion` 跨两层表头
  - `业务` 列在表体中做纵向合并
- 验收点：
  - 表头总层数为 2
  - `在线计算`、`在线队列` 水平居中
  - 在 `VRegion | 在线计算` 与 `在线计算 | 在线队列` 的组边界显示竖线
  - 组边界竖线颜色、宽度与普通边框一致
  - 表体中的业务列纵向合并高度正确
  - 其他普通指标列保持未合并状态

## 尺寸规则

- 表体尺寸兼容 `32 / 40 / 48 / 56`
- 表头单层高度规则：
  - `32 -> 32`
  - `40 / 48 / 56 -> 40`
- 双层表头总高度 = `headerHeight * 2`
- 表体纵向合并高度 = `bodyHeight * rowspan`
- 横向合并宽度 = 覆盖列宽求和

## 视觉规则

- 横向合并表头文本水平居中
- 纵向合并表体单元格保持原列对齐策略
- 合并单元格背景色与对应普通单元格一致
- 合并单元格描边颜色与对应普通单元格一致
- 被覆盖单元格不重复显示内容
- 被覆盖内部边线不显示

## 回归检查

- 使用老协议 `headers + rows + columnTypes + columnWidths` 创建普通表格，结果应与未接入 merge 前一致
- 普通表格下不应无故出现组边界竖线
- 普通表格的分页、筛选、tabs、buttonGroup 不应受影响

## 建议手测流程

1. 用 `case-1-single-group-merge.json` 创建表格，对照 `screenshot_10_10691.png`
2. 用 `case-2-multi-group-merge.json` 创建表格，对照 `screenshot_10_9937.png`
3. 分别切换 `32 / 40 / 48 / 56` 尺寸，确认表头和表体高度符合规则
4. 再用一个普通单层表头样例回归，确认旧逻辑不变
