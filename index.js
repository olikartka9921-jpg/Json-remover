/*
 * Auto JSON Cleaner for SillyTavern
 *
 * Permanently removes fenced ```json ... ``` blocks from older AI messages.
 * "Keep newest N" means:
 *   N = 4 -> depths 0-3 are kept, depth 4+ is cleaned.
 */

const MODULE_NAME = 'auto_json_cleaner';
const DEFAULTS = Object.freeze({
    enabled: true,
    keepNewest: 4,
});

function getContext() {
    return window.SillyTavern?.getContext?.();
}

function getSettings() {
    const ctx = getContext();
    if (!ctx?.extensionSettings) return { ...DEFAULTS };

    if (!ctx.extensionSettings[MODULE_NAME]) {
        ctx.extensionSettings[MODULE_NAME] = structuredClone(DEFAULTS);
    }

    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (!(key in ctx.extensionSettings[MODULE_NAME])) {
            ctx.extensionSettings[MODULE_NAME][key] = value;
        }
    }

    return ctx.extensionSettings[MODULE_NAME];
}

function saveSettings() {
    const ctx = getContext();
    ctx?.saveSettingsDebounced?.();
}

/**
 * Remove fenced JSON blocks.
 * Nested { } do not matter because the regex ends at the code fence.
 */
function cleanMessage(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/```json[ \t]*\r?\n?[\s\S]*?```/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function cleanOldMessages() {
    const ctx = getContext();
    const settings = getSettings();

    if (!ctx || !Array.isArray(ctx.chat) || !settings.enabled) return;

    const keepNewest = Math.max(
        0,
        Number.parseInt(settings.keepNewest, 10) || 0
    );

    // Depth 0 = newest message.
    // Keep depths 0..keepNewest-1.
    // Clean depth keepNewest and everything older.
    const firstIndexToClean = ctx.chat.length - 1 - keepNewest;

    if (firstIndexToClean < 0) return;

    let changed = false;

    for (let i = 0; i <= firstIndexToClean; i++) {
        const message = ctx.chat[i];

        // Only touch actual AI/character messages.
        if (!message || message.is_user || message.is_system) continue;
        if (typeof message.mes !== 'string') continue;

        const cleaned = cleanMessage(message.mes);

        if (cleaned !== message.mes) {
            message.mes = cleaned;
            changed = true;
        }
    }

    if (changed) {
        console.log(`[${MODULE_NAME}] Removed old JSON blocks.`);
        await ctx.saveChat?.();
    }
}

function addSettingsUI() {
    const settingsHost =
        document.getElementById('extensions_settings2') ||
        document.getElementById('extensions_settings');

    if (!settingsHost) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'inline-drawer auto-json-cleaner';

    wrapper.innerHTML = `
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Auto JSON Cleaner</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
        </div>

        <div class="inline-drawer-content">
            <label class="checkbox_label">
                <input id="ajc-enabled" type="checkbox">
                <span>Automatically clean old JSON</span>
            </label>

            <label>
                <span>Keep newest messages</span>
                <input id="ajc-depth" type="number" min="0" step="1" style="width: 70px;">
            </label>

            <small>
                4 means depths 0-3 stay untouched; depth 4 and older are cleaned.
            </small>

            <button id="ajc-clean-now" class="menu_button">
                Clean old JSON now
            </button>
        </div>
    `;

    settingsHost.appendChild(wrapper);

    const settings = getSettings();

    const enabled = wrapper.querySelector('#ajc-enabled');
    const depth = wrapper.querySelector('#ajc-depth');
    const cleanNow = wrapper.querySelector('#ajc-clean-now');

    enabled.checked = !!settings.enabled;
    depth.value = settings.keepNewest;

    enabled.addEventListener('change', () => {
        settings.enabled = enabled.checked;
        saveSettings();
    });

    depth.addEventListener('change', () => {
        const parsed = Number.parseInt(depth.value, 10);
        settings.keepNewest = Number.isFinite(parsed) ? Math.max(0, parsed) : 4;
        depth.value = settings.keepNewest;
        saveSettings();
    });

    cleanNow.addEventListener('click', () => {
        void cleanOldMessages();
    });
}

function init() {
    const ctx = getContext();
    if (!ctx) {
        console.error(`[${MODULE_NAME}] SillyTavern context unavailable.`);
        return;
    }

    getSettings();
    addSettingsUI();

    const { eventSource, eventTypes } = ctx;

    // MESSAGE_RECEIVED means the AI message is already in ctx.chat.
    // A small delay lets SillyTavern finish its own message-save/render cycle
    // before this extension persists the cleaned chat.
    eventSource?.on(eventTypes.MESSAGE_RECEIVED, () => {
        setTimeout(() => void cleanOldMessages(), 150);
    });

    // Also clean when loading/switching into a chat.
    eventSource?.on(eventTypes.CHAT_CHANGED, () => {
        setTimeout(() => void cleanOldMessages(), 150);
    });

    console.log(`[${MODULE_NAME}] Loaded.`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
