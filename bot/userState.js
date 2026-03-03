const userState = new Map();

function clearUserState(chatId) {
  userState.delete(chatId);
}

function getUserState(chatId) {
  return userState.get(chatId) || null;
}

function setUserState(chatId, patch) {
  const current = userState.get(chatId) || {};
  userState.set(chatId, {...current, ...patch});
}

module.exports = {
  userState,
  clearUserState,
  getUserState,
  setUserState,
};
