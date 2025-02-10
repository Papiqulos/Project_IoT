CREATE TABLE IF NOT EXISTS "User" (
	"password" string,
	"username" string,
	"role" string,
	"email" string,
	"phone_number" integer,
	PRIMARY KEY ("username")
);

CREATE TABLE IF NOT EXISTS "Business" (
	"address" string,
	"name" string,
	"type" string,
	"business_id" string,
	"username" string,
	PRIMARY KEY ("business_id", "username"),
	FOREIGN KEY ("username") REFERENCES "User" ("username")
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Data Source" (
	" type" string,
	"source_id" string,
	PRIMARY KEY ("source_id")
);

CREATE TABLE IF NOT EXISTS "Has Access" (
	"source_id" string,
	"business_id" string,
	PRIMARY KEY ("source_id", "business_id"),
	FOREIGN KEY ("source_id") REFERENCES "Data Source" ("source_id")
            ON UPDATE RESTRICT
            ON DELETE RESTRICT,
	FOREIGN KEY ("business_id") REFERENCES "Business" ("business_id")
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Citizen" (
	"name" string,
	"address" string,
	"username" string,
	PRIMARY KEY ("username"),
	FOREIGN KEY ("username") REFERENCES "User" ("username")
            ON UPDATE RESTRICT
            ON DELETE RESTRICT
);

