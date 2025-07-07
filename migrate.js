const fs = require('fs');
const db = require('./firebase');

const migrate = async () => {
  const activities = JSON.parse(fs.readFileSync('./data/activities.json', 'utf8'));
  const adventures = JSON.parse(fs.readFileSync('./data/adventures.json', 'utf8'));
  const daily = JSON.parse(fs.readFileSync('./data/daily.json', 'utf8'));
  const exercisePlan = JSON.parse(fs.readFileSync('./data/exercisePlan.json', 'utf8'));
  const habits = JSON.parse(fs.readFileSync('./data/habits.json', 'utf8'));
  const ideas = JSON.parse(fs.readFileSync('./data/ideas.json', 'utf8'));
  const phase = JSON.parse(fs.readFileSync('./data/phase.json', 'utf8'));
  const relationships = JSON.parse(fs.readFileSync('./data/relationships.json', 'utf8'));
  const timeline = JSON.parse(fs.readFileSync('./data/timeline.json', 'utf8'));
  const weeklyActivity = JSON.parse(fs.readFileSync('./data/weeklyActivity.json', 'utf8'));
  const weight = JSON.parse(fs.readFileSync('./data/weight.json', 'utf8'));
  const workoutLog = JSON.parse(fs.readFileSync('./data/workoutLog.json', 'utf8'));


  await db.ref('activities').set(activities);
  await db.ref('adventures').set(adventures);
  await db.ref('daily').set(daily);
  await db.ref('exercisePlan').set(exercisePlan);
  await db.ref('habits').set(habits);
  await db.ref('ideas').set(ideas);
  await db.ref('phase').set(phase);
  await db.ref('relationships').set(relationships);
  await db.ref('timeline').set(timeline);
  await db.ref('weeklyActivity').set(weeklyActivity);
  await db.ref('weight').set(weight);
  await db.ref('workoutLog').set(workoutLog);

  console.log('Migration complete');
};

migrate();
