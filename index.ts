import { S3Client } from "bun";

const client = new S3Client({
  accessKeyId: "1e916d22b3721ff8d74a7b0acc6c5bdc",
  secretAccessKey:
    "840ae25f0e7633cb5c678ec6ac4fa2d66cecd4c7306b519b78d81d33b7ddbc82",
  bucket: "disneyland-ride-data",
  endpoint: "https://4c4a97248c0a97b4725084e66e0dc734.r2.cloudflarestorage.com", // Cloudflare R2
});

const s3file: S3File = client.file("ride-data.json");
const json = (await s3file.json()) as RideData;

const dcaReq = await fetch("https://queue-times.com/parks/17/queue_times.json");
const dcaData = (await dcaReq.json()) as RideData;

const disneylandReq = await fetch(
  "https://queue-times.com/parks/16/queue_times.json"
);
const disneylandData = (await disneylandReq.json()) as RideData;

const newData = buildNewData(json, dcaData, disneylandData);
await s3file.write(JSON.stringify(newData));

function buildNewData(
  existingData: RideData,
  newDcaData: RideData,
  newDisneylandData: RideData
) {
  const data = { ...existingData };
  const { dca, disneyland } = data;

  // California Adventure
  const dcaLatestRides = newDcaData.lands.map((land) => land.rides).flat();
  const dcaRidesOpen = dcaLatestRides.filter((ride) => ride.is_open).length;
  for (const land of dca.lands) {
    for (const ride of land.rides) {
      const lastestRideData = dcaLatestRides.find((r) => r.id === ride.id);
      if (!lastestRideData) continue;
      if (
        lastestRideData.last_updated ===
        ride.history[ride.history.length - 1].last_updated
      )
        continue;
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
  const disneylandRidesOpen = disneylandLatestRides.filter(
    (ride) => ride.is_open
  ).length;
  for (const land of disneyland.lands) {
    for (const ride of land.rides) {
      const lastestRideData = disneylandLatestRides.find(
        (r) => r.id === ride.id
      );
      if (!lastestRideData) continue;
      if (
        lastestRideData.last_updated ===
        ride.history[ride.history.length - 1].last_updated
      )
        continue;
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
