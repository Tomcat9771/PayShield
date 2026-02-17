export function confirmAction(message) {
  return window.confirm(message);
}

export function confirmDangerousAction({
  title,
  description,
}) {
  return window.confirm(
    `${title}\n\n${description}\n\nThis action cannot be undone.`
  );
}
