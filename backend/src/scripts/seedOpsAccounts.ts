import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { UserRole, UserStatus } from "../constants/roles";
import { User } from "../modules/users/user.model";

const accounts = [
  {
    name: "2GO Operator",
    email: "operator@2go.local",
    phone: "+1000000101",
    role: UserRole.OPERATIONS,
  },
  {
    name: "2GO Super Admin",
    email: "superadmin@2go.local",
    phone: "+1000000102",
    role: UserRole.SYSTEM_OWNER,
  },
] as const;

async function seedOpsAccounts(): Promise<void> {
  let succeeded = false;
  try {
    await connectDatabase();

    const conflictingAccount = await User.findOne({
      $or: [
        { email: { $in: accounts.map(({ email }) => email) } },
        { phone: { $in: accounts.map(({ phone }) => phone) } },
      ],
    }).select("email phone");
    if (conflictingAccount) {
      throw new Error(
        "A requested seed email or phone is already in use. No account was changed.",
      );
    }

    const credentials = accounts.map((account) => ({
      ...account,
      password: randomBytes(24).toString("base64url"),
    }));

    for (const { password, ...account } of credentials) {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.create({
        ...account,
        passwordHash,
        status: UserStatus.ACTIVE,
      });
    }

    console.log("Seeded Operations accounts (save these passwords now):");
    for (const { name, email, phone, role, password } of credentials) {
      console.log(
        JSON.stringify({ name, email, phone, role, password }, null, 2),
      );
    }
    succeeded = true;
  } finally {
    await disconnectDatabase();
  }

  if (!succeeded) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  seedOpsAccounts().catch((error: unknown) => {
    console.error(
      "Unable to seed Operations accounts:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
