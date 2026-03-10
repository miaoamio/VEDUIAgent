# AI 多轮对话构建 B 端详情页案例

本案例旨在测试 AI Agent 通过多轮对话逐步构建复杂 UI 界面的能力。我们将从宏观布局开始，逐步深入到具体组件，构建一个典型的 B 端详情页。

## 场景描述
用户需要为一个 CRM 系统创建一个“客户详情页”。页面包含顶部导航栏、左侧菜单栏、页面主体内容（包含页头、标签页、基本信息卡片和关联订单表格）。

## 对话流程设计

### 第一轮：宏观布局 (Layout & Navigation)
**用户指令**: 
> "帮我创建一个 B 端详情页的框架。我需要一个顶部导航栏（高度 60px，深色背景），左侧是一个侧边栏菜单（宽度 240px，浅色背景），右侧是主要内容区域（白色背景）。"

**预期 AI 行为**:
1.  分析需求，识别出需要使用 `layout` 组件来构建整体结构。
2.  调用 `read_specs(['layout'])` 获取布局组件详情。
3.  创建最外层容器（水平布局）。
4.  在其中创建左侧菜单（`layout`, vertical, width 240）。
5.  在右侧创建内容区域容器（`layout`, vertical, flex grow）。
6.  在内容区域容器顶部创建导航栏（`layout`, horizontal, height 60）。

---

### 第二轮：填充导航与菜单 (Components)
**用户指令**:
> "在顶部导航栏左侧加一个文字 'CRM System'，右侧加一个用户头像（圆形）。在左侧菜单里添加三个按钮，分别是 'Dashboard', 'Customers', 'Settings'，其中 'Customers' 是选中状态（Primary 样式）。"

**预期 AI 行为**:
1.  识别组件：`text`, `layout` (用于头像占位), `button`。
2.  调用 `read_specs(['text', 'button'])`。
3.  **顶部导航**: 在导航栏容器内添加 `text` 和一个圆形的 `layout` 或 `table-cell` (带 showAvatar)。
4.  **左侧菜单**: 在左侧容器内依次添加三个 `button` 组件，设置不同的 `variant`。

---

### 第三轮：页面主体 - 页头与标签 (Header & Tabs)
**用户指令**:
> "在右侧主要内容区域，先加一个页头，包含标题 'Acme Corp' 和一个 'Edit' 按钮。页头下面加一行标签页（Tabs），包含 'Overview', 'Orders', 'Notes'，默认选中 'Overview'。"

**预期 AI 行为**:
1.  识别组件：`text` (标题), `button` (操作), `layout` (用于页头行和 Tabs 行), `button` (用于模拟 Tab)。
2.  **页头**: 创建一个水平 `layout`，左右对齐 (`primaryAxisAlignItems: SPACE_BETWEEN` - *注: 目前 layout 可能需要通过 spacing 或自动布局来实现效果*)。
3.  **Tabs**: 创建一个水平 `layout`，添加三个外观类似 Tab 的按钮（或使用 `text` + 下划线模拟）。

---

### 第四轮：详情卡片 (Card & Layout)
**用户指令**:
> "在标签页下面，创建一个 'Basic Info' 卡片。卡片里分两列显示信息：左边是 'Contact: John Doe' 和 'Email: john@acme.com'，右边是 'Phone: 123-456-7890' 和 'Status: Active'。"

**预期 AI 行为**:
1.  识别组件：`card`, `layout`, `text`。
2.  调用 `read_specs(['card'])`。
3.  创建一个 `card` 组件。
4.  在 Card 内部创建一个水平 `layout`（分两列）。
5.  在每列内部创建垂直 `layout`，包含两个 `text` 组件。

---

### 第五轮：数据表格 (Table)
**用户指令**:
> "最后，在卡片下面添加一个 'Recent Orders' 表格。表格有 4 列（Order ID, Date, Amount, Status），先显示 3 行数据。"

**预期 AI 行为**:
1.  识别组件：`table`。
2.  调用 `read_specs(['table', 'table-column'])`。
3.  创建 `table` 组件，参数 `columnCount: 4`, `rowCount: 3`。
4.  (高级预期) AI 可能会尝试进一步配置列名 `headerText`。

---

## 验证点
1.  **渐进式构建**: AI 是否能理解基于上一步的上下文（"在xxx下面"）。
2.  **组件选择**: 是否正确选择了 `layout` vs `card` vs `table`。
3.  **参数推断**: 是否正确推断了颜色（深色背景）、尺寸（60px, 240px）和样式（选中状态）。
4.  **嵌套关系**: 子组件是否正确放置在父容器中。
