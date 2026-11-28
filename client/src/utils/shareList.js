import { itemName } from './itemLabel';

/**
 * Chat/WhatsApp-friendly text builders and a "share or copy" helper for
 * the pick list and checklist pages.
 *
 * The shop runs over plain HTTP on the LAN, so the Web Share API and the
 * async Clipboard API are often unavailable (both need a secure context).
 * We try them first and fall back to a hidden-textarea copy that works
 * everywhere, including desktop browsers on http://<lan-ip>.
 */


/** Pick list (Peta Lokasi): consolidated bolts of a motorcycle and/or bundling. */
export function buildPickListShareText({ motorcycle, packageName, summary, bolts }) {
  const lines = [];
  lines.push('🔩 *Hex Titanium — Daftar Ambil Baut*');
  lines.push(`Motor: ${motorcycle?.displayName || '—'}`);
  if (packageName) lines.push(`Paket: ${packageName}`);

  const total = Number(summary?.totalQuantity) || 0;
  const count = Number(summary?.distinctBoltSpecsCount) || (bolts || []).length;
  lines.push(`Total: ${total} pcs (${count} barang)`);
  lines.push('');

  (bolts || []).forEach((b, i) => {
    lines.push(`${i + 1}. ${itemName(b)} — ${b.totalQuantity} pcs`);
    if (b.positionsSummary) lines.push(`   ${b.positionsSummary}`);
  });

  return lines.join('\n');
}

/** Checklist (Riwayat): one saved pick session with per-item check state. */
export function buildSessionShareText(session) {
  const lines = [];
  lines.push('📋 *Hex Titanium — Checklist Baut*');
  lines.push(`Motor: ${session?.motorcycleType?.displayName || '—'}`);
  if (session?.package?.name) lines.push(`Paket: ${session.package.name}`);
  lines.push(`Sesi #${session?.id ?? '—'} · ${session?.checkedItems ?? 0}/${session?.totalItems ?? 0} item diambil`);
  if (session?.buyerName) lines.push(`Pembeli: ${session.buyerName}`);
  lines.push('');

  (session?.items || []).forEach((it) => {
    const mark = it.checked ? '✅' : '⬜';
    lines.push(`${mark} ${itemName(it.boltSpec)} — ${it.quantity} pcs`);
    if (it.positionSummary) lines.push(`   ${it.positionSummary}`);
  });

  return lines.join('\n');
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy textarea copy
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share via the native share sheet when available (phones), otherwise copy the
 * text to the clipboard so staff can paste it into WhatsApp / chat.
 * Returns 'shared' | 'copied' | 'cancelled' | 'failed'.
 */
export async function shareOrCopy({ title, text, toast }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // any other failure: fall back to copying
    }
  }

  const ok = await copyText(text);
  if (ok) {
    toast?.success('Daftar baut disalin — tempel di WhatsApp atau chat.');
    return 'copied';
  }
  toast?.error('Gagal menyalin otomatis. Salin daftar secara manual.');
  return 'failed';
}
