export const codingQuestions = [
  {
    name: 'Two Sum',
    desc: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n You may assume that each input would have exactly one solution, and you may not use the same element twice.\nYou can return the answer in any order.',
    params: 'nums, target',
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      },
    ],
    inputs: [
      {
        input: `[2,7,11,15], 9`,
        target: [0, 1]
      },
      {
        input: `[3, 2, 4], 6`,
        target: [1, 2]
      }
    ]
  },

  // --- 10 more LeetCode Mediums ---

  {
    name: 'Add Two Numbers',
    desc: 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit.\nAdd the two numbers and return the sum as a linked list.\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.',
    params: 'l1, l2',
    examples: [
      {
        input: 'l1 = [2,4,3], l2 = [5,6,4]',
        output: '[7,0,8]',
        explanation: '342 + 465 = 807, so the returned list is [7,0,8].'
      },
      {
        input: 'l1 = [0], l2 = [0]',
        output: '[0]',
        explanation: '0 + 0 = 0.'
      },
    ],
    inputs: [
      {
        input: `[2,4,3], [5,6,4]`,
        target: [7, 0, 8]
      },
      {
        input: `[0], [0]`,
        target: [0]
      }
    ]
  },

  {
    name: 'Longest Substring Without Repeating Characters',
    desc: 'Given a string s, find the length of the longest substring without repeating characters.',
    params: 's',
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.'
      },
    ],
    inputs: [
      {
        input: `"abcabcbb"`,
        target: 3
      },
      {
        input: `"bbbbb"`,
        target: 1
      }
    ]
  },

  {
    name: 'Container With Most Water',
    desc: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]).\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\nReturn the maximum amount of water a container can store.',
    params: 'height',
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'The maximum area is formed between lines at indices 1 and 8: min(8,7) * (8-1) = 49.'
      },
      {
        input: 'height = [1,1]',
        output: '1',
        explanation: 'Using both lines gives area min(1,1) * 1 = 1.'
      },
    ],
    inputs: [
      {
        input: `[1,8,6,2,5,4,8,3,7]`,
        target: 49
      },
      {
        input: `[1,1]`,
        target: 1
      }
    ]
  },

  {
    name: 'Three Sum',
    desc: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\nNotice that the solution set must not contain duplicate triplets.',
    params: 'nums',
    examples: [
      {
        input: 'nums = [-1,0,1,2,-1,-4]',
        output: '[[-1,-1,2],[-1,0,1]]',
        explanation: 'The distinct triplets that sum to zero are [-1,-1,2] and [-1,0,1].'
      },
      {
        input: 'nums = [0,1,1]',
        output: '[]',
        explanation: 'There is no triplet that sums to 0.'
      },
    ],
    inputs: [
      {
        input: `[-1,0,1,2,-1,-4]`,
        target: [[-1, -1, 2], [-1, 0, 1]]
      },
      {
        input: `[0,1,1]`,
        target: []
      }
    ]
  },

  {
    name: 'Group Anagrams',
    desc: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
    params: 'strs',
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        explanation: 'Words with the same sorted letters belong in the same group.'
      },
      {
        input: 'strs = [""]',
        output: '[[""]]',
        explanation: 'A single empty string is its own anagram group.'
      },
    ],
    inputs: [
      {
        input: `["eat","tea","tan","ate","nat","bat"]`,
        target: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
      },
      {
        input: `[""]`,
        target: [[""]]
      }
    ]
  },

  {
    name: 'Top-K Frequent Elements',
    desc: 'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
    params: 'nums, k',
    examples: [
      {
        input: 'nums = [1,1,1,2,2,3], k = 2',
        output: '[1,2]',
        explanation: '1 occurs 3 times and 2 occurs 2 times, which are the top 2.'
      },
      {
        input: 'nums = [1], k = 1',
        output: '[1]',
        explanation: 'The only element is 1, so it is the most frequent.'
      },
    ],
    inputs: [
      {
        input: `[1,1,1,2,2,3], 2`,
        target: [1, 2]
      },
      {
        input: `[1], 1`,
        target: [1]
      }
    ]
  },

  {
    name: 'Product Of Array Except Self',
    desc: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\nThe product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\nYou must write an algorithm that runs in O(n) time and without using the division operation.',
    params: 'nums',
    examples: [
      {
        input: 'nums = [1,2,3,4]',
        output: '[24,12,8,6]',
        explanation: 'The product of all elements except self for each index gives [24,12,8,6].'
      },
      {
        input: 'nums = [-1,1,0,-3,3]',
        output: '[0,0,9,0,0]',
        explanation: 'All positions except the one excluding 0 will have product 0; excluding 0 gives 9.'
      },
    ],
    inputs: [
      {
        input: `[1,2,3,4]`,
        target: [24, 12, 8, 6]
      },
      {
        input: `[-1,1,0,-3,3]`,
        target: [0, 0, 9, 0, 0]
      }
    ]
  },

  {
    name: 'Longest Palindromic Substring',
    desc: 'Given a string s, return the longest palindromic substring in s.',
    params: 's',
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"bab" is a valid longest palindromic substring (another possible answer is "aba").'
      },
      {
        input: 's = "cbbd"',
        output: '"bb"',
        explanation: 'The longest palindromic substring is "bb".'
      },
    ],
    inputs: [
      {
        input: `"babad"`,
        target: "bab"
      },
      {
        input: `"cbbd"`,
        target: "bb"
      }
    ]
  },

  {
    name: 'Coin Change',
    desc: 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\nYou may assume that you have an infinite number of each kind of coin.',
    params: 'coins, amount',
    examples: [
      {
        input: 'coins = [1,2,5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1, so the minimum number of coins is 3.'
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1',
        explanation: 'It is not possible to make amount 3 with only coin 2.'
      },
    ],
    inputs: [
      {
        input: `[1,2,5], 11`,
        target: 3
      },
      {
        input: `[2], 3`,
        target: -1
      }
    ]
  },

  {
    name: 'Kth Largest Element In An Array',
    desc: 'Given an integer array nums and an integer k, return the k-th largest element in the array.\nNote that it is the k-th largest element in the sorted order, not the k-th distinct element.',
    params: 'nums, k',
    examples: [
      {
        input: 'nums = [3,2,1,5,6,4], k = 2',
        output: '5',
        explanation: 'The 2nd largest element is 5.'
      },
      {
        input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4',
        output: '4',
        explanation: 'In sorted order, the 4th largest is 4.'
      },
    ],
    inputs: [
      {
        input: `[3,2,1,5,6,4], 2`,
        target: 5
      },
      {
        input: `[3,2,3,1,2,4,5,5,6], 4`,
        target: 4
      }
    ]
  },

  {
    name: 'Decode String',
    desc: 'Given an encoded string s, return its decoded string.\nThe encoding rule is: k[encoded_string], where the encoded_string inside the square brackets is being repeated exactly k times.\nYou may assume that the input string is always valid; there are no extra white spaces, and the square brackets are well-formed.',
    params: 's',
    examples: [
      {
        input: 's = "3[a]2[bc]"',
        output: '"aaabcbc"',
        explanation: '3[a] expands to "aaa" and 2[bc] expands to "bcbc", giving "aaabcbc".'
      },
      {
        input: 's = "3[a2[c]]"',
        output: '"accaccacc"',
        explanation: 'a2[c] expands to "acc"; repeated 3 times gives "accaccacc".'
      },
    ],
    inputs: [
      {
        input: `"3[a]2[bc]"`,
        target: "aaabcbc"
      },
      {
        input: `"3[a2[c]]"`,
        target: "accaccacc"
      }
    ]
  },
]
