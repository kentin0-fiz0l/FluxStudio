/**
 * Messaging API endpoints
 */

import { buildMessagingUrl } from '../../config/environment';
import type { ApiService } from './base';
import {
  validate,
  sendMessageSchema,
  SendMessageInput,
} from '../apiValidation';

export function messagesApi(service: ApiService) {
  return {
    getMessages(channelId?: string) {
      const url = channelId
        ? buildMessagingUrl(`/messages?channelId=${channelId}`)
        : buildMessagingUrl('/messages');
      return service.makeRequest(url);
    },

    sendMessage(data: SendMessageInput) {
      const validated = validate(sendMessageSchema, data);
      return service.makeRequest(buildMessagingUrl('/messages'), {
        method: 'POST',
        body: JSON.stringify(validated),
      });
    },
  };
}
