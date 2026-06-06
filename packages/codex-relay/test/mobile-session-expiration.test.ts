import { describe, expect, it } from "vitest";

import {
  consumeInactiveSessionExpiredNotice,
  isClientTokenExpiredByInactivity,
  markInactiveSessionExpired,
  subscribeInactiveSessionExpired,
} from "../../../apps/mobile/src/lib/session-expiration.js";

describe("mobile session expiration notice", () => {
  it("detects inactivity expiry only when a stored token expiry has passed", () => {
    const now = Date.parse("2026-06-06T00:00:00.000Z");

    expect(isClientTokenExpiredByInactivity("2026-06-05T23:59:59.999Z", now)).toBe(true);
    expect(isClientTokenExpiredByInactivity("2026-06-06T00:00:00.001Z", now)).toBe(false);
    expect(isClientTokenExpiredByInactivity(undefined, now)).toBe(false);
    expect(isClientTokenExpiredByInactivity("not a date", now)).toBe(false);
  });

  it("notifies listeners once for the same pending inactive-expiry notice", () => {
    let notificationCount = 0;
    const unsubscribe = subscribeInactiveSessionExpired(() => {
      notificationCount += 1;
    });

    markInactiveSessionExpired();
    markInactiveSessionExpired();

    expect(notificationCount).toBe(1);
    expect(consumeInactiveSessionExpiredNotice()).toBe(true);
    expect(consumeInactiveSessionExpiredNotice()).toBe(false);

    markInactiveSessionExpired();
    expect(notificationCount).toBe(2);
    expect(consumeInactiveSessionExpiredNotice()).toBe(true);

    unsubscribe();
  });
});
