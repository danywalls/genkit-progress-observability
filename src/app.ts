import 'dotenv/config';
import { planTrip } from './agent.js';

function parseArgs() {
  const [destination = 'Ibiza', adultsArg = '2', kidsArg = '2', budgetArg = 'moderate', ...ageArgs] = process.argv.slice(2);

  const numAdults = Number.parseInt(adultsArg, 10) || 2;
  const numKids = Number.parseInt(kidsArg, 10) || 0;
  const kidAges = ageArgs.length > 0
    ? ageArgs.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value))
    : Array.from({ length: numKids }, (_, index) => 7 - index);

  return {
    destination,
    numAdults,
    numKids,
    kidAges,
    budget: budgetArg,
  };
}

async function main() {
  const { destination, numAdults, numKids, kidAges, budget } = parseArgs();

  console.log('Ibiza Family Travel Planner - Genkit\n');
  console.log('='.repeat(60));

  try {
    console.log(`\nPlanning a family trip to ${destination}...\n`);

    const plan = await planTrip(
      destination,
      numAdults,
      numKids,
      kidAges,
      budget
    );

    console.log('\n' + '='.repeat(60));
    console.log(`YOUR ${destination.toUpperCase()} FAMILY TRAVEL PLAN`);
    console.log('='.repeat(60));

    console.log(`\nDestination: ${plan.destination}`);
    console.log(`Duration: ${plan.duration}`);
    console.log(`\nSummary: ${plan.summary}`);

    console.log('\n--- FLIGHTS ---');
    plan.flights.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.airline}: ${f.departure} -> ${f.arrival} | ${f.price} | ${f.stops} stop(s)`);
    });

    console.log('\n--- HOTEL ---');
    console.log(`  ${plan.hotel.name} (${plan.hotel.rating}*)`);
    console.log(`  Price: ${plan.hotel.pricePerNight}/night`);
    console.log(`  Amenities: ${plan.hotel.amenities.join(', ')}`);

    console.log('\n--- ACTIVITIES ---');
    plan.activities.forEach((a, i) => {
      console.log(`  ${i + 1}. [${a.category}] ${a.name}`);
      console.log(`     Cost: ${a.costPerPerson}/person | Duration: ${a.duration}`);
      console.log(`     ${a.description}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL ESTIMATED COST: ${plan.totalEstimatedCost}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error generating travel plan:', error);
  }
}

main();
