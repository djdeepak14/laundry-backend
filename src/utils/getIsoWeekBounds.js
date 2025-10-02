import { DateTime } from "luxon"

function getIsoWeekBoundsFromUtc(startUtc, tz = "Europe/Berlin") {
  const dtLocal = DateTime.fromJSDate(startUtc, { zone: tz });
  const startOfWeekLocal = dtLocal.minus({ days: dtLocal.weekday - 1 }).startOf("day");
  const endOfWeekLocalExcl = startOfWeekLocal.plus({ days: 7 });
  return {
    startUtc: startOfWeekLocal.toUTC().toJSDate(),
    endUtcExcl: endOfWeekLocalExcl.toUTC().toJSDate(),
  };
}

export { getIsoWeekBoundsFromUtc }
