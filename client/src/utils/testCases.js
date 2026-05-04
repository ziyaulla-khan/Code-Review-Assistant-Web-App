/**
 * Sample Test Cases
 * Use these to verify the AI code review functionality
 */

// TEST 1: JavaScript with bugs, security, and performance issues
const testJS = `function getUserData(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  db.execute(query);
  
  const data = fetch('/api/data');
  return data.json();
}

function calculateSum(arr) {
  let sum = 0;
  for (let i = 0; i <= arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

const users = [];
for (let i = 0; i < 1000000; i++) {
  users.push({ id: i, name: "User " + i });
}
`;

// TEST 2: Python with issues
const testPython = `import os

def read_file(filename):
    os.system("cat " + filename)
    
def process_data(items):
    result = []
    for item in items:
        if item > 10:
            result.append(item * 2)
    return result
    
def get_user(id):
    user = db.query("SELECT * FROM users WHERE id = %s" % id)
    return user[0]
`;

// TEST 3: Clean code (should return no issues or minimal)
const testCleanJS = `/**
 * Calculate the sum of an array of numbers
 * @param {number[]} numbers - Array of numbers
 * @returns {number} Sum of all numbers
 */
function calculateSum(numbers) {
  if (!Array.isArray(numbers)) {
    throw new TypeError('Expected an array of numbers');
  }
  
  return numbers.reduce((sum, num) => {
    if (typeof num !== 'number') {
      throw new TypeError('All elements must be numbers');
    }
    return sum + num;
  }, 0);
}

module.exports = { calculateSum };
`;

export { testJS, testPython, testCleanJS };
