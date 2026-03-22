export interface BaseLibraryComponentTokenProfile {
  token: string;
  componentKey: string;
  source: string;
  displayName: string;
  category: string;
  aliases?: string[];
}



// Generated from Figma组件库词汇表_ComponentSets.json
// Rules: remove internal/_components/panel/slot entries; keep main components for agent usage.
// GeneratedAt: 2026-03-13T13:34:52.000Z
// Count: 100
export const BASE_LIBRARY_COMPONENT_TOKEN_PACK: Record<string, BaseLibraryComponentTokenProfile> = {
  'lib-layout-divider': {
    token: 'lib-layout-divider',
    componentKey: '3e1832b1cb594bc7a31805be88967c359ffe5e6e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Divider',
    category: '布局',
    aliases: ['figma-set:Divider']
  },
  'lib-navigation-steps': {
    token: 'lib-navigation-steps',
    componentKey: '329423acfa88f75014d5c127e9a2223b8fcd86f4',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '步骤条',
    category: '导航',
    aliases: ['figma-set:步骤条']
  },
  'lib-navigation-top-nav': {
    token: 'lib-navigation-top-nav',
    componentKey: 'bde7297e2e07b6380f9850c67b590df1b440021e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '顶部导航',
    category: '导航',
    aliases: ['figma-set:顶部导航']
  },
  'lib-navigation-anchor': {
    token: 'lib-navigation-anchor',
    componentKey: '3495aec09721d6eacfbe3028036f69546435def7',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Anchor 锚点',
    category: '导航',
    aliases: ['figma-set:Anchor 锚点']
  },
  'lib-navigation-breadcrumb': {
    token: 'lib-navigation-breadcrumb',
    componentKey: '727e5a59c09ccafa68737e4cd23aa9f0d0354c31',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Breadcrumb 面包屑',
    category: '导航',
    aliases: ['figma-set:Breadcrumb 面包屑']
  },
  'lib-navigation-dropdown': {
    token: 'lib-navigation-dropdown',
    componentKey: '5e6f4710d2c14cc6cf44ea86def1099beb024d1c',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Dropdown 下拉菜单',
    category: '导航',
    aliases: ['figma-set:Dropdown 下拉菜单']
  },
  'lib-navigation-header': {
    token: 'lib-navigation-header',
    componentKey: 'f75d67ec3641bb846aa05d21669cc1d02f227967',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Header 页头',
    category: '导航',
    aliases: ['figma-set:Header 页头']
  },
  'lib-navigation-menu': {
    token: 'lib-navigation-menu',
    componentKey: '4496be3ff5c3285149aadc832fda2d0ca91c61f2',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Menu 侧导航',
    category: '导航',
    aliases: ['figma-set:Menu 侧导航']
  },
  'lib-navigation-pagination': {
    token: 'lib-navigation-pagination',
    componentKey: '0e1ed7b2c19ed13d7889ad0e3373d861a8a34477',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Pagination 分页',
    category: '导航',
    aliases: ['figma-set:Pagination 分页']
  },
  'lib-feedback-drawer': {
    token: 'lib-feedback-drawer',
    componentKey: '220c9c0f3992a0dd0bdffc555995845f6c9d437e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '抽屉 Drawer',
    category: '反馈',
    aliases: ['figma-set:抽屉 Drawer']
  },
  'lib-feedback-alert': {
    token: 'lib-feedback-alert',
    componentKey: '8885eb316fd43fa95238e9ea0a8bf55d3f02a3f5',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Alert 警告提示',
    category: '反馈',
    aliases: ['figma-set:Alert 警告提示']
  },
  'lib-feedback-message': {
    token: 'lib-feedback-message',
    componentKey: '74d953dcc0f31a9cf04916f1b90d4cbbf2b7e344',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Message 全局公告',
    category: '反馈',
    aliases: ['figma-set:Message 全局公告']
  },
  'lib-feedback-modal': {
    token: 'lib-feedback-modal',
    componentKey: '4b46e03230cba8680dba61fd3e10ec73b819bdc9',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Modal 对话框',
    category: '反馈',
    aliases: ['figma-set:Modal 对话框']
  },
  'lib-feedback-modal-confirm': {
    token: 'lib-feedback-modal-confirm',
    componentKey: '1d085a1348c2bde2a43f15d7acf12a779fcf53a1',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Modal-confirm 确认对话框',
    category: '反馈',
    aliases: ['figma-set:Modal-confirm 确认对话框']
  },
  'lib-feedback-notification': {
    token: 'lib-feedback-notification',
    componentKey: '838eb6c49a91d180d08100be0d0402e6b12ce9c6',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Notification 通知提醒',
    category: '反馈',
    aliases: ['figma-set:Notification 通知提醒']
  },
  'lib-feedback-popconfirm': {
    token: 'lib-feedback-popconfirm',
    componentKey: 'c929a897787611cdc7333df450d45b323651844f',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Popconfirm 气泡确认框',
    category: '反馈',
    aliases: ['figma-set:Popconfirm 气泡确认框']
  },
  'lib-feedback-progress-line': {
    token: 'lib-feedback-progress-line',
    componentKey: '4343577511ca6dd426361026f46629e0bcdbbcaa',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Progress-line 进度条(线)',
    category: '反馈',
    aliases: ['figma-set:Progress-line 进度条(线)']
  },
  'lib-basic-button': {
    token: 'lib-basic-button',
    componentKey: 'a539f78c79dc3ab8df6c18d806b0666f64fae1ab',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Button 按钮',
    category: '基础',
    aliases: ['figma-set:Button 按钮']
  },
  'lib-basic-link': {
    token: 'lib-basic-link',
    componentKey: 'f41466dcfeadfa7f023b8f76862ccb43196e940e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Link 链接',
    category: '基础',
    aliases: ['figma-set:Link 链接']
  },
  'lib-data-input-login-form': {
    token: 'lib-data-input-login-form',
    componentKey: 'dac6c37e35b02e175afafd5265ff1280e79d95b1',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '登录表单',
    category: '数据输入',
    aliases: ['figma-set:登录表单']
  },
  'lib-data-input-autocomplete': {
    token: 'lib-data-input-autocomplete',
    componentKey: '355fad193afc9d482a114e9e435bce05c970d60c',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AutoComplete 自动补全',
    category: '数据输入',
    aliases: ['figma-set:AutoComplete 自动补全']
  },
  'lib-data-input-button': {
    token: 'lib-data-input-button',
    componentKey: 'd93abfb10eb04a5723ba8016b9147c131b54dc6d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Button 按钮上传',
    category: '数据输入',
    aliases: ['figma-set:Button 按钮上传']
  },
  'lib-data-input-cascader': {
    token: 'lib-data-input-cascader',
    componentKey: '7245c6d58b6dae1ef68cdffb0c90798cb57bfb7d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Cascader 级联选择',
    category: '数据展示',
    aliases: ['figma-set:Cascader 级联选择']
  },
  'lib-data-input-checkbox': {
    token: 'lib-data-input-checkbox',
    componentKey: '51a9e035c762059b3c592e77aadbbe5b22dcb04e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Checkbox 复选框',
    category: '数据输入',
    aliases: ['figma-set:Checkbox 复选框']
  },
  'lib-data-input-checkbox-group': {
    token: 'lib-data-input-checkbox-group',
    componentKey: 'ca3d2f097d5c3a695f6b4b8c8d7455b03d6dcafd',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Checkbox Group 复选框组',
    category: '数据输入',
    aliases: ['figma-set:Checkbox Group 复选框组']
  },
  'lib-data-input-datepicker': {
    token: 'lib-data-input-datepicker',
    componentKey: '75d61442da83762c096571de0f34f56012bea78d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Datepicker 日期选择器',
    category: '数据输入',
    aliases: ['figma-set:Datepicker 日期选择器']
  },
  'lib-data-input-drag': {
    token: 'lib-data-input-drag',
    componentKey: '2014a5ca9e9b957e51f9af5394bc29915a19e651',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Drag 拖拽上传',
    category: '数据输入',
    aliases: ['figma-set:Drag 拖拽上传']
  },
  'lib-data-input-form': {
    token: 'lib-data-input-form',
    componentKey: '25f071ee2f2569f0fd3744d41ed085020d386b26',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Form 表单',
    category: '数据输入',
    aliases: ['figma-set:Form 表单']
  },
  'lib-data-input-horizontal-form': {
    token: 'lib-data-input-horizontal-form',
    componentKey: '621ab3ad5d95d291cb6d31438dbad667594ae098',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Horizontal Form 横向表单',
    category: '数据输入',
    aliases: ['figma-set:Horizontal Form 横向表单']
  },
  'lib-data-input-image': {
    token: 'lib-data-input-image',
    componentKey: '85ba2a0764a9485d4b07cdd6420a44292b8f4fcc',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Image 图片上传',
    category: '数据输入',
    aliases: ['figma-set:Image 图片上传']
  },
  'lib-data-input-input': {
    token: 'lib-data-input-input',
    componentKey: 'f04bea11a4ef73f626b7402aac670a94ad32faf0',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Input 输入框',
    category: '数据输入',
    aliases: ['figma-set:Input 输入框']
  },
  'lib-data-input-inputgroup': {
    token: 'lib-data-input-inputgroup',
    componentKey: 'b67f094a9256bf4cc0da575d6524f9b8b46c00c7',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Inputgroup 输入框组',
    category: '数据输入',
    aliases: ['figma-set:Inputgroup 输入框组']
  },
  'lib-data-input-inputnumber': {
    token: 'lib-data-input-inputnumber',
    componentKey: '207e734d854bc8d664b0218f431761c985ecccf1',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'InputNumber 数字输入框',
    category: '数据输入',
    aliases: ['figma-set:InputNumber 数字输入框']
  },
  'lib-data-input-radio': {
    token: 'lib-data-input-radio',
    componentKey: 'c5e8d61d59e1d17540ef918252cde1e2ce149f03',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Radio 单选框',
    category: '数据输入',
    aliases: ['figma-set:Radio 单选框']
  },
  'lib-data-input-radio-group': {
    token: 'lib-data-input-radio-group',
    componentKey: '360abf928135cb51b513e27732dfc609c0dffe14',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Radio Group 单选框组',
    category: '数据输入',
    aliases: ['figma-set:Radio Group 单选框组']
  },
  'lib-data-input-search': {
    token: 'lib-data-input-search',
    componentKey: '4394ad4bddd9e82a82ae9a3aa6f6ff0c574a4ff8',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Search 搜索框',
    category: '数据输入',
    aliases: ['figma-set:Search 搜索框']
  },
  'lib-data-input-segmented-picker': {
    token: 'lib-data-input-segmented-picker',
    componentKey: '94125fa758354931512313d1bb6ce37aae02b8c7',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Segmented Picker 分段选择器',
    category: '数据输入',
    aliases: ['figma-set:Segmented Picker 分段选择器']
  },
  'lib-data-input-select': {
    token: 'lib-data-input-select',
    componentKey: 'd124dbe0576b8dfd900897124bd14e888e4db6f3',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Select 选择器',
    category: '数据输入',
    aliases: ['figma-set:Select 选择器']
  },
  'lib-data-input-select-borderless': {
    token: 'lib-data-input-select-borderless',
    componentKey: 'c60ca4a915c3861605ba17f1416d09b29512a77a',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Select-Borderless 无边框选择器',
    category: '数据输入',
    aliases: ['figma-set:Select-Borderless 无边框选择器']
  },
  'lib-data-input-slider': {
    token: 'lib-data-input-slider',
    componentKey: 'cc707c07037cc48e0551dcd72feae6dabe9ed484',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Slider 滑动输入',
    category: '数据输入',
    aliases: ['figma-set:Slider 滑动输入']
  },
  'lib-data-input-switch': {
    token: 'lib-data-input-switch',
    componentKey: 'd6017b9a513cbd53d6963d768259bbe0fcb8ddde',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Switch 开关',
    category: '数据输入',
    aliases: ['figma-set:Switch 开关']
  },
  'lib-data-input-textarea': {
    token: 'lib-data-input-textarea',
    componentKey: 'acba4b2ca240bc5a54672107c78235f4f82fd419',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'TextArea 文本域',
    category: '数据输入',
    aliases: ['figma-set:TextArea 文本域']
  },
  'lib-data-input-timepicker': {
    token: 'lib-data-input-timepicker',
    componentKey: 'b6eadcc611e8d23cea25b9799bc317154a718322',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Timepicker 时间选择器',
    category: '数据输入',
    aliases: ['figma-set:Timepicker 时间选择器']
  },
  'lib-data-input-timepicker-menu': {
    token: 'lib-data-input-timepicker-menu',
    componentKey: 'bae12d9dfb4f45c2dfd211d447a30ac53b56ee26',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'TimePicker-menu 时间选择器菜单',
    category: '数据输入',
    aliases: ['figma-set:TimePicker-menu 时间选择器菜单']
  },
  'lib-data-input-transfer': {
    token: 'lib-data-input-transfer',
    componentKey: '91aa7f09c8b35252733355dffca7274fc03c850d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Transfer 数据穿梭框',
    category: '数据输入',
    aliases: ['figma-set:Transfer 数据穿梭框']
  },
  'lib-data-input-treeselect': {
    token: 'lib-data-input-treeselect',
    componentKey: '9ba274503ab0dba7d0abf90c22192c94b0cb02bb',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Treeselect 树选择',
    category: '数据输入',
    aliases: ['figma-set:Treeselect 树选择']
  },
  'lib-data-input-vertical-form': {
    token: 'lib-data-input-vertical-form',
    componentKey: '0be124134930bd594da9da61af7046c4e442878d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Vertical Form 纵向表单',
    category: '数据输入',
    aliases: ['figma-set:Vertical Form 纵向表单']
  },
  'lib-data-display-card-pic': {
    token: 'lib-data-display-card-pic',
    componentKey: '9e7fd9a7a42488a6dfbdc4822066729a078f49a6',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '卡片 Card-图片 Pic',
    category: '数据展示',
    aliases: ['figma-set:卡片 Card-图片 Pic']
  },
  'lib-data-display-avatar-editable': {
    token: 'lib-data-display-avatar-editable',
    componentKey: 'a54d66508e3d54f5db521e1f189caf45b34dfab0',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: '可编辑头像',
    category: '数据展示',
    aliases: ['figma-set:可编辑头像']
  },
  'lib-data-display-add-tag': {
    token: 'lib-data-display-add-tag',
    componentKey: '3402d492e9cc9cd182e53addda7b647b5b98824e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Add Tag 添加标签',
    category: '数据展示',
    aliases: ['figma-set:Add Tag 添加标签']
  },
  'lib-data-display-avatar': {
    token: 'lib-data-display-avatar',
    componentKey: 'aec22c3b5dc500fb30959d048063170cd77e6abf',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Avatar 头像',
    category: '数据展示',
    aliases: ['figma-set:Avatar 头像']
  },
  'lib-data-display-avatargroop': {
    token: 'lib-data-display-avatargroop',
    componentKey: '0c0c6c4c739a3317d1897e15a6bc96dca1a8662d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AvatarGroop 头像组',
    category: '数据展示',
    aliases: ['figma-set:AvatarGroop 头像组']
  },
  'lib-data-display-avataricon': {
    token: 'lib-data-display-avataricon',
    componentKey: 'e8cae07d6783736ec763be0c5b474e21842902a3',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AvatarIcon 头像图标',
    category: '数据展示',
    aliases: ['figma-set:AvatarIcon 头像图标']
  },
  'lib-data-display-badge': {
    token: 'lib-data-display-badge',
    componentKey: '54bd3fb9f7e48d3234dfaccdf4810ddeca5ae539',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Badge 徽标',
    category: '数据展示',
    aliases: ['figma-set:Badge 徽标']
  },
  'lib-data-display-badge-avatar': {
    token: 'lib-data-display-badge-avatar',
    componentKey: 'f67ae4bd04f3c39aa33c14d5a5f1c5aa5f8edec1',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Badge+avatar 徽标+头像',
    category: '数据展示',
    aliases: ['figma-set:Badge+avatar 徽标+头像']
  },
  'lib-data-display-calendar': {
    token: 'lib-data-display-calendar',
    componentKey: '7906a6460bc14fc0aab5b3e1e004489f3c822693',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Calendar 日历',
    category: '数据展示',
    aliases: ['figma-set:Calendar 日历']
  },
  'lib-data-display-card': {
    token: 'lib-data-display-card',
    componentKey: '8892d33a43451d9eb3d6251bfd07712dc1a1d3cd',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Card 卡片',
    category: '数据展示',
    aliases: ['figma-set:Card 卡片']
  },
  'lib-data-display-collapse': {
    token: 'lib-data-display-collapse',
    componentKey: '3de69eb3db0810ee8b175c7d8ecbbf07c58e3a54',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Collapse 折叠面板',
    category: '数据展示',
    aliases: ['figma-set:Collapse 折叠面板']
  },
  'lib-data-display-descriptions': {
    token: 'lib-data-display-descriptions',
    componentKey: '28a8d9c0652b6c199e9b40641fc06d5a67a7e600',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Descriptions 描述列表',
    category: '数据展示',
    aliases: ['figma-set:Descriptions']
  },
  'lib-data-display-digital-tag': {
    token: 'lib-data-display-digital-tag',
    componentKey: '928aa07dc25a1e41fc69a48b948834411121c505',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Digital Tag 数字标签',
    category: '数据展示',
    aliases: ['figma-set:Digital Tag 数字标签']
  },
  'lib-data-display-toplist': {
    token: 'lib-data-display-toplist',
    componentKey: '6acea515cbcd1ae970ef5627425bd55cbda137ff',
    source: 'Figma组件库词汇表_ComponentSets 图表.json',
    displayName: 'Toplist 条形图',
    category: '数据展示',
    aliases: ['figma-set:Toplist 条形图']
  },
  'lib-data-display-list': {
    token: 'lib-data-display-list',
    componentKey: '3f790aed52a836b6210de70949f8594a2ef653ba',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'List 列表',
    category: '数据展示',
    aliases: ['figma-set:List 列表']
  },
  'lib-data-display-multicolor-tag': {
    token: 'lib-data-display-multicolor-tag',
    componentKey: '1fe9750b5bb150ddbff545a49e6bf442683fe85c',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'MultiColor Tag 多色标签',
    category: '数据展示',
    aliases: ['figma-set:MultiColor Tag 多色标签']
  },
  'lib-data-display-other-tag': {
    token: 'lib-data-display-other-tag',
    componentKey: '2d9c0e17cb30fdb3fb4d5a785f8e5ed4e638252e',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Other Tag 其他标签',
    category: '数据展示',
    aliases: ['figma-set:Other Tag 其他标签']
  },
  'lib-data-display-othertabs': {
    token: 'lib-data-display-othertabs',
    componentKey: '6d9e7cb10773c4659dcdfdb2cffb6c268a0b0221',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Othertabs 其他选项卡样式',
    category: '数据展示',
    aliases: ['figma-set:Othertabs 其他选项卡样式']
  },
  'lib-data-display-component-piechart': {
    token: 'lib-data-display-component-piechart',
    componentKey: 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
    source: 'Figma组件库词汇表_ComponentSets 图表.json',
    displayName: 'PieChart 饼图',
    category: '数据展示',
    aliases: ['figma-set:Component/PieChart']
  },
  'lib-data-display-component-barchart': {
    token: 'lib-data-display-component-barchart',
    componentKey: 'a83efa5b5ba4efbdb96694268b50e43a61bee971',
    source: 'Figma组件库词汇表_ComponentSets 图表.json',
    displayName: 'BarChart 柱状图',
    category: '数据展示',
    aliases: ['figma-set:BarChart 柱状图']
  },
  'lib-data-display-component-areachart': {
    token: 'lib-data-display-component-areachart',
    componentKey: '99fdb5caaa7ae3a429f0bb83022f737cd34caa01',
    source: 'Figma组件库词汇表_ComponentSets 图表.json',
    displayName: 'AreaChart 面积图',
    category: '数据展示',
    aliases: ['figma-set:AreaChart 面积图']
  },
  'lib-data-display-component-linechart': {
    token: 'lib-data-display-component-linechart',
    componentKey: '62d6b59603766fdb416ff787eec5d21800264694',
    source: 'Figma组件库词汇表_ComponentSets 图表.json',
    displayName: 'LineChart 折线图',
    category: '数据展示',
    aliases: ['figma-set:折线图']
  },
  'lib-data-display-piclist': {
    token: 'lib-data-display-piclist',
    componentKey: '4a94b3da5e1ce54430a22c627029d1c3a0df2b78',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'PicList 图片列表',
    category: '数据展示',
    aliases: ['figma-set:PicList 图片列表']
  },
  'lib-data-display-popover': {
    token: 'lib-data-display-popover',
    componentKey: '1aa0a28fc871d9368c69cbe99c2ff0c0aaae5cb7',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Popover 气泡卡片',
    category: '数据展示',
    aliases: ['figma-set:Popover 气泡卡片']
  },
  'lib-data-display-statistic': {
    token: 'lib-data-display-statistic',
    componentKey: '984f1ee1fe2ca3b9096f0f18dfc091c003a27f65',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Statistic 数值显示',
    category: '数据展示',
    aliases: ['figma-set:Statistic 数值显示']
  },
  'lib-data-display-status-tag': {
    token: 'lib-data-display-status-tag',
    componentKey: '03929d474a32cb373ef51950eef4f25970649ab0',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Status Tag 状态标签',
    category: '数据展示',
    aliases: ['figma-set:Status Tag 状态标签']
  },
  'lib-data-display-table': {
    token: 'lib-data-display-table',
    componentKey: 'bfccce80a53ec4ed52182f155c06653123a9864d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Table 表格',
    category: '数据展示',
    aliases: ['figma-set:Table 表格']
  },
  'lib-data-display-tableexpand': {
    token: 'lib-data-display-tableexpand',
    componentKey: '2510986b76fdf4dda2fa0045d9882ef3877c1822',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'TableExpand 展开表格',
    category: '数据展示',
    aliases: ['figma-set:TableExpand 展开表格']
  },
  'lib-data-display-tablefixation': {
    token: 'lib-data-display-tablefixation',
    componentKey: 'c081103df8d15a1fef8309d5d794b2e7a6404c2b',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'TableFixation 固定表格',
    category: '数据展示',
    aliases: ['figma-set:TableFixation 固定表格']
  },
  'lib-data-display-tabs': {
    token: 'lib-data-display-tabs',
    componentKey: '43d661890f421adcaca45eeba551fb00dc2edcd1',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Tabs 选项卡',
    category: '数据展示',
    aliases: ['figma-set:Tabs 选项卡']
  },
  'lib-data-display-tag': {
    token: 'lib-data-display-tag',
    componentKey: '19089a80333c317accdfb64ccd31736c7fef9dbd',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Tag 默认标签',
    category: '数据展示',
    aliases: ['figma-set:Tag 默认标签']
  },
  'lib-data-display-timeline': {
    token: 'lib-data-display-timeline',
    componentKey: '335c356695092876a2f1718c907541e928dccb65',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Timeline 时间轴',
    category: '数据展示',
    aliases: ['figma-set:Timeline 时间轴']
  },
  'lib-data-display-tooltip': {
    token: 'lib-data-display-tooltip',
    componentKey: '2eb76d229c8bd334dfa7054d4a5909f97c3c6899',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Tooltip 文字气泡',
    category: '数据展示',
    aliases: ['figma-set:Tooltip 文字气泡']
  },
  'lib-data-display-tree': {
    token: 'lib-data-display-tree',
    componentKey: 'e963b2f2c512e2005cd306379ed39b81dd0b245c',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Tree',
    category: '数据展示',
    aliases: ['figma-set:Tree']
  },
  'lib-misc-ai-button-group': {
    token: 'lib-misc-ai-button-group',
    componentKey: '60bb4b331507842afcde2d03a1a298e37b7ea5ae',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Button group 智能按钮组',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Button group 智能按钮组']
  },
  'lib-misc-ai-floating-menu': {
    token: 'lib-misc-ai-floating-menu',
    componentKey: 'b5280f0d933035b99458bf63dcd3c2770d9aabee',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Floating menu 悬浮菜单',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Floating menu 悬浮菜单']
  },
  'lib-misc-risk-level-tag': {
    token: 'lib-misc-risk-level-tag',
    componentKey: '5213fbef91da23af8b1a1db570c482156037fe90',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Risk Level Tag 风险等级标签',
    category: '未分类',
    aliases: ['figma-set:Risk Level Tag 风险等级标签']
  },
  'lib-misc-safety-tag': {
    token: 'lib-misc-safety-tag',
    componentKey: 'e454991493ca9e3e7e623f2b9ed0ce4b4991261f',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'Safety Tag 安全标签',
    category: '未分类',
    aliases: ['figma-set:Safety Tag 安全标签']
  },
  'lib-ai-ai-accept': {
    token: 'lib-ai-ai-accept',
    componentKey: '7e16aee1dc7490b13d3f42af200209981287adf8',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Accept采纳按钮组',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Accept采纳按钮组']
  },
  'lib-ai-ai-button': {
    token: 'lib-ai-ai-button',
    componentKey: '6f00d37932bf86e4ed8e95ec2cef53089dcfc228',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Button 智能按钮',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Button 智能按钮']
  },
  'lib-ai-ai-card': {
    token: 'lib-ai-ai-card',
    componentKey: 'b175a60d33eba4eabd669cb150423178811aeeb5',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Card 智能卡片',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Card 智能卡片']
  },
  'lib-ai-ai-chat-editor': {
    token: 'lib-ai-ai-chat-editor',
    componentKey: '9e465df7927d32c72182957cc90fb13813626c9d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Chat Editor 对话编辑器',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Chat Editor 对话编辑器']
  },
  'lib-ai-ai-feedback': {
    token: 'lib-ai-ai-feedback',
    componentKey: '87fe83f1488c2de01e769b9b01729745852d5ab3',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Feedback基础反馈',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Feedback基础反馈']
  },
  'lib-ai-ai-modal': {
    token: 'lib-ai-ai-modal',
    componentKey: '683d3c791333359f03a70bf25e1435a675efd107',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Modal 智能对话框',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Modal 智能对话框']
  },
  'lib-ai-ai-popconfirm': {
    token: 'lib-ai-ai-popconfirm',
    componentKey: '24b69364e72795b04009d1f58e8e01bba1d364c6',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Popconfirm 智能化气泡确认框',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Popconfirm 智能化气泡确认框']
  },
  'lib-ai-ai-progressbar': {
    token: 'lib-ai-ai-progressbar',
    componentKey: '4427dac55b49b8600c341dc95589a428039c2c7d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI ProgressBar进度条(线)',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI ProgressBar进度条(线)']
  },
  'lib-ai-ai-search': {
    token: 'lib-ai-ai-search',
    componentKey: '6fb129fd4e24b704062cc9daa22b56cb56b1447d',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Search 智能搜索框',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Search 智能搜索框']
  },
  'lib-ai-ai-shortcut-key': {
    token: 'lib-ai-ai-shortcut-key',
    componentKey: '24d079652bb113daa2608577978d3ecf70bf9457',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI Shortcut key 快捷键',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI Shortcut key 快捷键']
  },
  'lib-ai-ai-textarea': {
    token: 'lib-ai-ai-textarea',
    componentKey: '49af2690f504a1f56b545e4287acdd904809f78a',
    source: 'Figma组件库词汇表_ComponentSets.json',
    displayName: 'AI TextArea 智能文本域',
    category: 'AI/火山引擎智能化',
    aliases: ['figma-set:AI TextArea 智能文本域']
  },
};

