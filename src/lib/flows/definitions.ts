// ============================================
// AssistMint — WhatsApp Flow JSON (v5.0) builders
// Pure functions producing Flow JSON for our three
// vertical flows. Grammar verified against Meta's
// current Flow JSON reference + the v5.0 example
// shipped in the "Sending a Flow" guide:
//   - top level: version, data_api_version, routing_model, screens (array)
//   - endpoint-powered flows REQUIRE data_api_version + routing_model
//   - screen: { id, title, data (data model), layout: SingleColumnLayout }
//   - text components use `text`; list components use `data-source`
//   - buttons live in a Footer with `on-click-action: { name, payload }`
//   - dynamic values bind with "${data.field}" and must be declared in
//     the screen's data model
// ============================================

/** Flow JSON version — 5.0 FROZE Sep 2025 (publishing frozen-version flows is
 *  PROHIBITED — the live flow health reported `valid_versions` errors); 7.x
 *  reverted the 6.0 on-select-action breaking change, so our grammar targets
 *  7.3 (current) directly. */
export const FLOW_JSON_VERSION = '7.3';
/** Data API version our endpoint implements (request/response protocol version). */
export const FLOW_DATA_API_VERSION = '3.0';

// ─── Flow kinds ─────────────────────────────

export type FlowKind = 'appointment' | 'feedback' | 'address';

/** First screen the client renders for each flow kind (used by INIT responses). */
export const FLOW_FIRST_SCREEN: Record<FlowKind, string> = {
  appointment: 'SERVICE_PICK',
  feedback: 'RATING',
  address: 'ADDRESS',
};

/** Screen IDs for the appointment flow. */
export const APPOINTMENT_SCREENS = {
  SERVICE_PICK: 'SERVICE_PICK',
  DATE_TIME: 'DATE_TIME',
  CONFIRM: 'CONFIRM',
} as const;

/** Screen IDs for the feedback flow. */
export const FEEDBACK_SCREENS = {
  RATING: 'RATING',
  COMMENT: 'COMMENT',
} as const;

/** Screen IDs for the address capture flow. */
export const ADDRESS_SCREENS = {
  ADDRESS: 'ADDRESS',
} as const;

// ─── Flow JSON types ────────────────────────

export interface FlowDataSourceItem {
  id: string;
  title: string;
  description?: string;
}

interface FlowComponentBase {
  /** Boolean or expression. */
  visible?: boolean | string;
}

export interface FlowTextComponent extends FlowComponentBase {
  type: 'TextHeading' | 'TextSubheading' | 'TextBody' | 'TextCaption';
  text: string;
}

export interface FlowRadioButtonsGroupComponent extends FlowComponentBase {
  type: 'RadioButtonsGroup';
  name: string;
  label: string;
  /** Static item array, or a dynamic expression like "${data.services}". */
  'data-source': FlowDataSourceItem[] | string;
  required?: boolean;
  description?: string;
}

export interface FlowDatePickerComponent extends FlowComponentBase {
  type: 'DatePicker';
  name: string;
  label: string;
  required?: boolean;
  /** YYYY-MM-DD (computed at build time). */
  'min-date'?: string;
  'max-date'?: string;
}

export interface FlowTextInputComponent extends FlowComponentBase {
  type: 'TextInput';
  name: string;
  label: string;
  'input-type'?: 'text' | 'email' | 'number' | 'password' | 'phone';
  required?: boolean;
  'init-value'?: string;
  'helper-text'?: string;
  'max-length'?: number;
}

export interface FlowTextAreaComponent extends FlowComponentBase {
  type: 'TextArea';
  name: string;
  label: string;
  required?: boolean;
  'init-value'?: string;
  'helper-text'?: string;
}

export interface FlowFooterComponent extends FlowComponentBase {
  type: 'Footer';
  label: string;
  'on-click-action': FlowAction;
}

export type FlowAction =
  /** Submit the current screen to our endpoint (the response picks the next screen). */
  | { name: 'data_exchange'; payload: Record<string, unknown> }
  /** Terminate the flow client-side (only valid on terminal screens). */
  | { name: 'complete'; payload: Record<string, unknown> }
  /** Navigate statically to another screen. */
  | { name: 'navigate'; next: { type: 'screen'; name: string }; payload: Record<string, unknown> };

export type FlowComponent =
  | FlowTextComponent
  | FlowRadioButtonsGroupComponent
  | FlowDatePickerComponent
  | FlowTextInputComponent
  | FlowTextAreaComponent
  | FlowFooterComponent;

/** One field of a screen's data model (what the endpoint may supply when rendering the screen). */
export interface FlowScreenDataField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Example value used by the Flow Builder preview. */
  __example__?: string | number | boolean | null | unknown[] | Record<string, unknown>;
}

export type FlowScreenData = Record<string, FlowScreenDataField>;

export interface FlowScreen {
  id: string;
  title: string;
  terminal?: boolean;
  data?: FlowScreenData;
  layout: {
    type: 'SingleColumnLayout';
    children: FlowComponent[];
  };
}

export interface FlowJson {
  version: string;
  data_api_version: string;
  /** screen id → screens the endpoint may route to next. */
  routing_model: Record<string, string[]>;
  screens: FlowScreen[];
}

/** A service/menu item offered in the appointment flow. `price` is in paise (codebase convention). */
export interface FlowServiceOption {
  id: string;
  name: string;
  /** Price in paise (e.g. 35000 = ₹350). 0 hides the price. */
  price: number;
}

// ─── Shared helpers (pure) ──────────────────

function dataExchangeFooter(label: string): FlowFooterComponent {
  return {
    type: 'Footer',
    label,
    'on-click-action': { name: 'data_exchange', payload: {} },
  };
}

/**
 * Terminal footer — ends the flow. Meta's validator REQUIRES at least one
 * terminal screen (MISSING_TERMINAL_SCREEN otherwise); the completion data
 * arrives via the flow_response webhook / endpoint data_exchange protocol.
 */
function completeFooter(label: string): FlowFooterComponent {
  return {
    type: 'Footer',
    label,
    'on-click-action': { name: 'complete', payload: {} },
  };
}

/** Format a paise amount as a display string ("₹350"). */
export function formatPaise(price: number): string {
  const rupees = price / 100;
  // Avoid trailing ".00" but keep ".5" style halves exact.
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

/** Clamp a string to a maximum length (Flow JSON limits). */
function clampText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1).trimEnd() + '…' : value;
}

/** Format "HH:MM" (24h) as "H:MM AM/PM". */
export function formatTimeLabel(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${period}`;
}

/** Default bookable slots: 30-minute intervals, 10:00–18:30. */
export function generateDefaultTimeSlots(): string[] {
  const slots: string[] = [];
  for (let minutes = 10 * 60; minutes <= 18 * 60 + 30; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
}

/** Today's date (UTC) as YYYY-MM-DD — used for the DatePicker floor at build time. */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** N days from today as YYYY-MM-DD. */
export function daysFromToday(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// ─── 1. APPOINTMENT_BOOKING ─────────────────
// Salon / clinic / coaching / services:
//   SERVICE_PICK (radio group, services baked at build time)
//   → DATE_TIME (date picker + time chips)
//   → CONFIRM (dynamic summary) → endpoint creates the appointment → SUCCESS

export function buildAppointmentFlow(
  services: FlowServiceOption[],
  options: { timeSlots?: string[] } = {}
): FlowJson {
  const timeSlots = options.timeSlots ?? generateDefaultTimeSlots();

  const serviceItems: FlowDataSourceItem[] = services.slice(0, 30).map((service) => ({
    id: service.id,
    title: clampText(service.name, 60),
    ...(service.price > 0 ? { description: formatPaise(service.price) } : {}),
  }));

  const slotItems: FlowDataSourceItem[] = timeSlots.map((slot) => ({
    id: slot,
    title: formatTimeLabel(slot),
  }));

  return {
    version: FLOW_JSON_VERSION,
    data_api_version: FLOW_DATA_API_VERSION,
    routing_model: {
      [APPOINTMENT_SCREENS.SERVICE_PICK]: [APPOINTMENT_SCREENS.DATE_TIME],
      [APPOINTMENT_SCREENS.DATE_TIME]: [APPOINTMENT_SCREENS.CONFIRM],
      [APPOINTMENT_SCREENS.CONFIRM]: [],
    },
    screens: [
      {
        id: APPOINTMENT_SCREENS.SERVICE_PICK,
        title: 'Book an appointment',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Book an appointment' },
            { type: 'TextBody', text: 'Pick a service to get started.' },
            {
              type: 'RadioButtonsGroup',
              name: 'service_id',
              label: 'Service',
              required: true,
              'data-source': serviceItems,
            },
            dataExchangeFooter('Continue'),
          ],
        },
      },
      {
        id: APPOINTMENT_SCREENS.DATE_TIME,
        title: 'Date & time',
        data: {
          summary_service: { type: 'string', __example__: 'Haircut' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextSubheading', text: '${data.summary_service}' },
            {
              type: 'DatePicker',
              name: 'date',
              label: 'Select a date',
              required: true,
              'min-date': todayDateString(),
              'max-date': daysFromToday(180),
            },
            {
              type: 'RadioButtonsGroup',
              name: 'time',
              label: 'Time slot',
              required: true,
              'data-source': slotItems,
            },
            dataExchangeFooter('Continue'),
          ],
        },
      },
      {
        id: APPOINTMENT_SCREENS.CONFIRM,
        title: 'Confirm',
        terminal: true,
        data: {
          summary: { type: 'string', __example__: 'Haircut on 2026-09-14 at 10:00' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Confirm your booking' },
            { type: 'TextBody', text: '${data.summary}' },
            completeFooter('Confirm booking'),
          ],
        },
      },
    ],
  };
}

// ─── 2. FEEDBACK ────────────────────────────
// Post-order / post-visit:
//   RATING (1–5 chips) → COMMENT (optional text) → endpoint persists → SUCCESS

export function buildFeedbackFlow(): FlowJson {
  const ratingItems: FlowDataSourceItem[] = [5, 4, 3, 2, 1].map((n) => ({
    id: String(n),
    title: `${'⭐'.repeat(n)} ${n}/5`,
  }));

  return {
    version: FLOW_JSON_VERSION,
    data_api_version: FLOW_DATA_API_VERSION,
    routing_model: {
      [FEEDBACK_SCREENS.RATING]: [FEEDBACK_SCREENS.COMMENT],
      [FEEDBACK_SCREENS.COMMENT]: [],
    },
    screens: [
      {
        id: FEEDBACK_SCREENS.RATING,
        title: 'Rate us',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'How was your experience?' },
            { type: 'TextBody', text: 'Your feedback helps us improve.' },
            {
              type: 'RadioButtonsGroup',
              name: 'rating',
              label: 'Rating',
              required: true,
              'data-source': ratingItems,
            },
            dataExchangeFooter('Next'),
          ],
        },
      },
      {
        id: FEEDBACK_SCREENS.COMMENT,
        title: 'Anything else?',
        terminal: true,
        data: {
          rating_summary: { type: 'string', __example__: '4/5' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextSubheading', text: 'You rated us ${data.rating_summary} — thank you!' },
            {
              type: 'TextArea',
              name: 'feedback',
              label: 'Tell us more (optional)',
            },
            completeFooter('Submit'),
          ],
        },
      },
    ],
  };
}

// ─── 3. ADDRESS_CAPTURE ─────────────────────
// Delivery / home services:
//   ADDRESS (name + phone + address + landmark) → endpoint saves → SUCCESS

export interface AddressFlowPrefill {
  name?: string;
  phone?: string;
}

export function buildAddressFlow(prefill: AddressFlowPrefill = {}): FlowJson {
  const nameInput: FlowTextInputComponent = {
    type: 'TextInput',
    name: 'name',
    label: 'Full name',
    required: true,
    'input-type': 'text',
  };
  if (prefill.name) nameInput['init-value'] = clampText(prefill.name, 80);

  const phoneInput: FlowTextInputComponent = {
    type: 'TextInput',
    name: 'phone',
    label: 'Phone number',
    required: true,
    'input-type': 'phone',
    'helper-text': 'For delivery updates',
  };
  if (prefill.phone) phoneInput['init-value'] = clampText(prefill.phone, 15);

  return {
    version: FLOW_JSON_VERSION,
    data_api_version: FLOW_DATA_API_VERSION,
    routing_model: {
      [ADDRESS_SCREENS.ADDRESS]: [],
    },
    screens: [
      {
        id: ADDRESS_SCREENS.ADDRESS,
        title: 'Delivery address',
        terminal: true,
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Delivery details' },
            { type: 'TextBody', text: 'Where should we deliver your order?' },
            nameInput,
            phoneInput,
            {
              type: 'TextArea',
              name: 'address',
              label: 'Full address',
              required: true,
            },
            {
              type: 'TextInput',
              name: 'landmark',
              label: 'Landmark (optional)',
              'input-type': 'text',
            },
            completeFooter('Save address'),
          ],
        },
      },
    ],
  };
}
