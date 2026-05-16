export function formatMessage(template, values = {}) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template || ""
  );
}

export function getTicketStatusLabel(labels, status) {
  return labels?.ticketStatuses?.[status] || status;
}

export function getTicketPriorityLabel(labels, priority) {
  return labels?.ticketPriorities?.[priority] || priority;
}

export function getTicketCategoryLabel(labels, category) {
  return labels?.ticketCategories?.[category] || category;
}

export function getRequestTypeLabel(labels, requestType) {
  return labels?.contact?.requestTypes?.[requestType] || requestType;
}

export function getUploadStatusLabel(labels, status) {
  return labels?.uploadStatuses?.[status] || status;
}
