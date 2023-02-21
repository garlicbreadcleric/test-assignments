use std::collections::HashMap;

const MINE_SCALE: usize = 100;

struct NumberMap {
  map: HashMap<u128, u8>,
}

impl NumberMap {
  pub fn new() -> NumberMap {
    NumberMap {
      map: HashMap::new(),
    }
  }

  pub fn inc(&mut self, key: u128) {
    let value = self.get(key);
    self.map.insert(key, value + 1);
  }

  pub fn dec(&mut self, key: u128) {
    let value = self.get(key);
    if value > 0 {
      self.map.insert(key, value - 1);
    }
  }

  pub fn get(&self, key: u128) -> u8 {
    *self.map.get(&key).unwrap_or(&0)
  }
}

fn find_crumble(numbers: &[u128]) -> Option<u128> {
  let mut map = NumberMap::new();

  for i in 0..MINE_SCALE {
    map.inc(numbers[i]);
  }

  for i in MINE_SCALE..numbers.len() {
    let xi = numbers[i];

    let mut found_sum = false;
    for j in i - MINE_SCALE..i {
      let xj = numbers[j];
      let count = xi.checked_sub(xj).map(|diff| map.get(diff)).unwrap_or(0);

      if count > 0 && (xi - xj != xj || count > 1) {
        found_sum = true;
        break;
      }
    }

    if !found_sum {
      return Some(xi);
    }

    map.dec(numbers[i - MINE_SCALE]);
    map.inc(numbers[i]);
  }

  None
}

fn main() {
  let numbers: Vec<u128> = std::fs::read_to_string("challenge_input.txt")
    .unwrap()
    .split('\n')
    .filter(|s| !s.is_empty())
    .map(|s| s.parse().unwrap())
    .collect();

  for _ in 0..10000 {
    find_crumble(&numbers); // Some(14)
  }
}
