export const Z_INDEX_LAYERS = {

  DEFAULT: 0,
  WATERMARK: 5,
  STICKY_HEADER: 10,
  SIDEBAR: 20,
  FIXED_HEADER: 30,

  FLOATING_PANEL: 100,
  TOOLTIP: 150,
  DROPDOWN_MENU: 200,
  POPOVER: 250,

  BACKDROP: 300,
  DRAWER: 400,
  MODAL_BACKDROP: 500,

  CONTEXT_MENU: 1000,
  FUNCTION_DROPDOWN: 10001,

  MODAL: 10000,
  NESTED_MODAL: 10002,
  /** Date picker calendar popover inside modals */
  DATE_PICKER_POPOVER: 10003,
  /** Select/Popover/DropdownMenu content portaled to body — must paint above dialog/sheet layers */
  OVERLAY_POPOVER: 10003,
  ALERT_MODAL: 50000,
  TOAST: 100000,
} as const;

export const Z_INDEX_CLASSES = {
  DEFAULT: 'z-0',
  WATERMARK: 'z-[5]',
  STICKY_HEADER: 'z-10',
  SIDEBAR: 'z-20',
  FIXED_HEADER: 'z-30',
  FLOATING_PANEL: 'z-[100]',
  TOOLTIP: 'z-[150]',
  DROPDOWN_MENU: 'z-[200]',
  POPOVER: 'z-[250]',
  BACKDROP: 'z-[300]',
  DRAWER: 'z-[400]',
  MODAL_BACKDROP: 'z-[500]',
  CONTEXT_MENU: 'z-[1000]',
  FUNCTION_DROPDOWN: 'z-[10001]',
  MODAL: 'z-[10000]',
  NESTED_MODAL: 'z-[10002]',
  DATE_PICKER_POPOVER: 'z-[10003]',
  OVERLAY_POPOVER: 'z-[10003]',
  ALERT_MODAL: 'z-[50000]',
  TOAST: 'z-[100000]',
} as const;
