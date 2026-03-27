export const TEST_PASSWORD = "TestPassword123!";
export const TEST_EMAIL_DOMAIN =
  process.env.QA_TEST_EMAIL_DOMAIN || "bragg-qa-test.local";

export const TEST_USERS = {
  owner: {
    email: `owner@${TEST_EMAIL_DOMAIN}`,
    displayName: "Squad Owner",
    dob: "1995-01-15",
  },
  admin: {
    email: `admin@${TEST_EMAIL_DOMAIN}`,
    displayName: "Squad Admin",
    dob: "1996-03-20",
  },
  member: {
    email: `member@${TEST_EMAIL_DOMAIN}`,
    displayName: "Squad Member",
    dob: "1998-07-10",
  },
  pending: {
    email: `pending@${TEST_EMAIL_DOMAIN}`,
    displayName: "Pending User",
    dob: "1997-11-25",
  },
  outsider: {
    email: `outsider@${TEST_EMAIL_DOMAIN}`,
    displayName: "Outsider User",
    dob: "1999-02-14",
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;
