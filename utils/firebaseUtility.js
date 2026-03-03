const {db} = require('../configs/firebaseConfig');

async function saveExpense({budgetId, userId, data}) {
  const expensesRef = db
    .collection('budgets')
    .doc(budgetId)
    .collection('users')
    .doc(userId)
    .collection('expenses');
  await expensesRef.doc(data.id).set(data);
}

async function getLastExpense({budgetId, userId}) {
  const expensesRef = db
    .collection('budgets')
    .doc(budgetId)
    .collection('users')
    .doc(userId)
    .collection('expenses');
  const snap = await expensesRef.orderBy('date', 'desc').limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}

async function getMonthExpenses({budgetId, userId, from, to}) {
  const expensesRef = db
    .collection('budgets')
    .doc(budgetId)
    .collection('users')
    .doc(userId)
    .collection('expenses');
  const snap = await expensesRef.where('date', '>=', from).where('date', '<', to).get();
  return snap.docs.map((d) => d.data());
}

module.exports = {saveExpense, getLastExpense, getMonthExpenses};
