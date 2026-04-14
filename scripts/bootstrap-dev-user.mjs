import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const HASH_PREFIX = "scrypt";
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTES = 16;

function hashPassword(password) {
  const normalized = password.normalize("NFKC");
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = scryptSync(normalized, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    HASH_PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt,
    derived.toString("hex"),
  ].join("$");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run dev bootstrap in production. This path is development-only."
    );
  }

  const email = process.env.FSM_DEV_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.FSM_DEV_BOOTSTRAP_PASSWORD ?? "";
  const role = process.env.FSM_DEV_BOOTSTRAP_ROLE?.trim() || "admin";
  const firstName = process.env.FSM_DEV_BOOTSTRAP_FIRST_NAME?.trim() || "Dev";
  const lastName = process.env.FSM_DEV_BOOTSTRAP_LAST_NAME?.trim() || "Admin";

  if (!email) {
    throw new Error("FSM_DEV_BOOTSTRAP_EMAIL is required.");
  }

  if (!password || password.trim().length < 8) {
    throw new Error(
      "FSM_DEV_BOOTSTRAP_PASSWORD is required and must be at least 8 characters."
    );
  }

  const allowedRoles = new Set([
    "admin",
    "operations_manager",
    "support",
    "sales",
    "technician",
  ]);
  if (!allowedRoles.has(role)) {
    throw new Error(`FSM_DEV_BOOTSTRAP_ROLE is invalid: "${role}".`);
  }

  const passwordHash = hashPassword(password);
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            role,
            isActive: true,
            firstName,
            lastName,
          },
          select: {
            id: true,
            email: true,
            role: true,
          },
        })
      : await prisma.user.create({
          data: {
            email,
            role,
            isActive: true,
            firstName,
            lastName,
          },
          select: {
            id: true,
            email: true,
            role: true,
          },
        });

    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "passwordHash" = ${passwordHash},
        "updatedAt" = NOW()
      WHERE "id" = ${user.id}
    `;

    console.log(
      `[dev-auth-bootstrap] ensured user ${user.email} (${user.role}) id=${user.id}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[dev-auth-bootstrap] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
