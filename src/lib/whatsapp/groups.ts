// ============================================
// AssistMint — WhatsApp Groups API (minimal client)
// ============================================
// Groups are invite-only: create a group, share the invite link, then send
// group text messages. Max 8 participants, 10,000 groups per business
// number; requires an Official Business Account. Group non-template
// messages are free (group_service).
//
// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups

import { extractMessageId, graphRequest } from './shared';
import type { GraphSuccess, MessageSendEnvelope, PhoneNumberCredential } from './types';

export interface CreateGroupOptions extends PhoneNumberCredential {
  /** Group subject (max 128 chars, whitespace trimmed). */
  subject: string;
  /** Group description (max 2048 chars). */
  description?: string;
  /** Whether invite-link joins need approval. Default: 'auto_approve'. */
  joinApprovalMode?: 'approval_required' | 'auto_approve';
}

/**
 * Create a group via `POST /{phoneNumberId}/groups`. The business number
 * becomes creator/admin. The initial invite link arrives in the
 * `group_lifecycle_update` webhook — or fetch it later with
 * {@link getGroupInviteLink}.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/reference
 */
export async function createGroup(options: CreateGroupOptions): Promise<{ id: string }> {
  const { phoneNumberId, accessToken, subject, description, joinApprovalMode } = options;
  const data = await graphRequest<{ id?: string; group_id?: string }>({
    path: `${phoneNumberId}/groups`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      subject: subject.trim().substring(0, 128),
      ...(description !== undefined ? { description: description.substring(0, 2048) } : {}),
      ...(joinApprovalMode !== undefined ? { join_approval_mode: joinApprovalMode } : {}),
    },
  });
  const groupId = data.id ?? data.group_id;
  if (!groupId) {
    throw new Error('createGroup: group id missing in Graph API response');
  }
  return { id: groupId };
}

/**
 * Get a group's invite link via `GET /{groupId}/invite_link`. Send the link
 * (e.g. with the group invite template) to customers you want in the group.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/reference
 */
export async function getGroupInviteLink(options: {
  groupId: string;
  accessToken: string;
}): Promise<{ inviteLink: string }> {
  const { groupId, accessToken } = options;
  const data = await graphRequest<{ invite_link?: string }>({
    path: `${groupId}/invite_link`,
    accessToken,
  });
  if (!data.invite_link) {
    throw new Error('getGroupInviteLink: invite_link missing in Graph API response');
  }
  return { inviteLink: data.invite_link };
}

/**
 * Reset a group's invite link via `POST /{groupId}/invite_link`. All
 * previous links become invalid — use to revoke a leaked link.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/reference
 */
export async function resetGroupInviteLink(options: {
  groupId: string;
  accessToken: string;
}): Promise<{ inviteLink: string }> {
  const { groupId, accessToken } = options;
  const data = await graphRequest<{ invite_link?: string }>({
    path: `${groupId}/invite_link`,
    accessToken,
    method: 'POST',
    body: { messaging_product: 'whatsapp' },
  });
  if (!data.invite_link) {
    throw new Error('resetGroupInviteLink: invite_link missing in Graph API response');
  }
  return { inviteLink: data.invite_link };
}

/**
 * Send a text message to a group via the standard Messages endpoint with
 * the group id as the recipient. Only send after participants have joined
 * (watch `group_participants_update` webhooks).
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups
 */
export async function sendGroupTextMessage(
  options: PhoneNumberCredential & { groupId: string; text: string }
): Promise<{ message_id: string }> {
  const { phoneNumberId, accessToken, groupId, text } = options;
  const data = await graphRequest<MessageSendEnvelope>({
    path: `${phoneNumberId}/messages`,
    accessToken,
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      to: groupId,
      type: 'text',
      text: { preview_url: true, body: text },
    },
  });
  return { message_id: extractMessageId(data) };
}

/**
 * Delete a group (removes all participants, including the business number)
 * via `DELETE /{groupId}`.
 *
 * Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/reference
 */
export async function deleteGroup(options: { groupId: string; accessToken: string }): Promise<GraphSuccess> {
  const { groupId, accessToken } = options;
  return graphRequest<GraphSuccess>({
    path: groupId,
    accessToken,
    method: 'DELETE',
  });
}
