import { S3Client, type S3File } from "bun";

const client = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  bucket: process.env.S3_BUCKET_NAME || "disneyland-ride-data",
  endpoint:
    process.env.S3_ENDPOINT ||
    "https://4c4a97248c0a97b4725084e66e0dc734.r2.cloudflarestorage.com", // Cloudflare R2
});

const s3file: S3File = client.file("ride-data.json");
const json = (await s3file.json()) as RideData;

const dcaReq = await fetch("https://queue-times.com/parks/17/queue_times.json");
const dcaData = (await dcaReq.json()) as RideData;

const disneylandReq = await fetch(
  "https://queue-times.com/parks/16/queue_times.json"
);
const disneylandData = (await disneylandReq.json()) as RideData;

const dcaRidesOpen = ridesOpen(dcaData);
const disneylandRidesOpen = ridesOpen(disneylandData);

if (dcaRidesOpen + disneylandRidesOpen >= 15) {
  const newData = buildNewData(json, dcaData, disneylandData);
  await s3file.write(JSON.stringify(newData));
}

function buildNewData(
  existingData: RideData,
  newDcaData: RideData,
  newDisneylandData: RideData
) {
  const data = { ...existingData };
  const { dca, disneyland } = data;

  // California Adventure
  const dcaLatestRides = newDcaData.lands.map((land) => land.rides).flat();
  for (const land of dca.lands) {
    for (const ride of land.rides) {
      const lastestRideData = dcaLatestRides.find((r) => r.id === ride.id);
      if (!lastestRideData) continue;
      if (
        lastestRideData.last_updated ===
        ride.history[ride.history.length - 1]?.last_updated
      )
        continue;
      // Cap the history at 150
      if (ride.history.length === 150) ride.history.shift();
      ride.history.push({
        is_open: lastestRideData.is_open,
        wait_time: lastestRideData.wait_time,
        last_updated: lastestRideData.last_updated,
      });
    }
  }

  // Disneyland
  const disneylandLatestRides = newDisneylandData.lands
    .map((land) => land.rides)
    .flat();
  for (const land of disneyland.lands) {
    for (const ride of land.rides) {
      const lastestRideData = disneylandLatestRides.find(
        (r) => r.id === ride.id
      );
      if (!lastestRideData) continue;
      if (
        lastestRideData.last_updated ===
        ride.history[ride.history.length - 1]?.last_updated
      )
        continue;
      // Cap the history at 150
      if (ride.history.length === 150) ride.history.shift();
      ride.history.push({
        is_open: lastestRideData.is_open,
        wait_time: lastestRideData.wait_time,
        last_updated: lastestRideData.last_updated,
      });
    }
  }

  data.updatedAt = new Date().toISOString();
  return data;
}

function ridesOpen(parkData: RideData) {
  return parkData.lands
    .map((land) => land.rides)
    .flat()
    .filter((ride) => ride.is_open).length;
}
