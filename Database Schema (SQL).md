-- Core Tables
CREATE TABLE players (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  class VARCHAR(20) NOT NULL,
  main_spec VARCHAR(30) NOT NULL,
  off_spec VARCHAR(30),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  joined_date DATE,
  raid_team INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE items (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slot VARCHAR(20) NOT NULL,
  raid VARCHAR(50) NOT NULL,
  boss VARCHAR(50) NOT NULL,
  phase VARCHAR(5) NOT NULL,
  loot_priority TEXT,
  loot_points INTEGER DEFAULT 100,
  wowhead_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE item_bis_specs (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES items(id),
  spec VARCHAR(30) NOT NULL,
  is_current_phase BOOLEAN DEFAULT true,
  is_next_phase BOOLEAN DEFAULT false
);

CREATE TABLE loot_records (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES items(id),
  player_id UUID REFERENCES players(id),
  response VARCHAR(30) NOT NULL,
  loot_date DATE NOT NULL,
  phase VARCHAR(5) NOT NULL,
  loot_points INTEGER NOT NULL,
  slot VARCHAR(20) NOT NULL,
  rc_timestamp TIMESTAMP,
  rc_session_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  raid_date DATE NOT NULL,
  raid_name VARCHAR(50) NOT NULL,
  attended BOOLEAN DEFAULT false,
  fully_attended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, raid_date, raid_name)
);

CREATE TABLE bis_configurations (
  id UUID PRIMARY KEY,
  spec VARCHAR(30) NOT NULL,
  phase VARCHAR(5) NOT NULL,
  slot VARCHAR(20) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  source VARCHAR(100),
  UNIQUE(spec, phase, slot)
);

CREATE TABLE raid_quests (
  id UUID PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  quest_name VARCHAR(50) NOT NULL,
  phase VARCHAR(5) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date DATE,
  UNIQUE(player_id, quest_name)
);

CREATE TABLE raid_splits (
  id UUID PRIMARY KEY,
  raid_number INTEGER NOT NULL,
  player_id UUID REFERENCES players(id),
  role VARCHAR(10) NOT NULL,
  UNIQUE(raid_number, player_id)
);

-- Configuration Tables
CREATE TABLE class_configs (
  id UUID PRIMARY KEY,
  class_name VARCHAR(20) NOT NULL UNIQUE,
  color_hex VARCHAR(7) NOT NULL,
  token_type VARCHAR(30)
);

CREATE TABLE tier_set_configs (
  id UUID PRIMARY KEY,
  tier VARCHAR(5) NOT NULL,
  class_name VARCHAR(20) NOT NULL,
  chest_name VARCHAR(100),
  hands_name VARCHAR(100),
  head_name VARCHAR(100),
  legs_name VARCHAR(100),
  shoulders_name VARCHAR(100),
  UNIQUE(tier, class_name)
);