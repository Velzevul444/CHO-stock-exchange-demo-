-- Users
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        Email         NVARCHAR(256) NOT NULL UNIQUE,
        PasswordHash  NVARCHAR(256) NOT NULL,
        CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Tables (restaurant tables)
IF OBJECT_ID('dbo.RestaurantTables', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RestaurantTables (
        Id         INT IDENTITY(1,1) PRIMARY KEY,
        Name       NVARCHAR(64) NOT NULL,
        Capacity   INT NOT NULL
    );

    INSERT INTO dbo.RestaurantTables (Name, Capacity)
    VALUES ('A1', 2), ('A2', 2), ('B1', 4), ('B2', 4), ('C1', 6);
END
GO

-- Menu
IF OBJECT_ID('dbo.MenuItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MenuItems (
        Id            INT IDENTITY(1,1) PRIMARY KEY,
        Name          NVARCHAR(128) NOT NULL,
        Description   NVARCHAR(512) NULL,
        PriceCents    INT NOT NULL,
        DailyLimit    INT NOT NULL DEFAULT 50 -- max per day across all preorders
    );

    INSERT INTO dbo.MenuItems (Name, Description, PriceCents, DailyLimit) VALUES
    (N'Фем-боул с лососем', N'Рис, лосось, авокадо, кунжут', 89000, 40),
    (N'Чай маття латте', N'Матча на растительном молоке', 35000, 60),
    (N'Панкейки с клубникой', N'Пышные, соус ваниль', 49000, 35),
    (N'Рамен «Ляшки»', N'Пикантный бульон, лапша, яйцо', 79000, 45),
    (N'Сет мини-десертов', N'Ассорти, 6 шт.', 69000, 30);
END
GO

-- Reservations
IF OBJECT_ID('dbo.Reservations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reservations (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        UserId       INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        TableId      INT NOT NULL FOREIGN KEY REFERENCES dbo.RestaurantTables(Id),
        ReservedAt   DATETIME2 NOT NULL, -- start datetime UTC
        DurationMin  INT NOT NULL DEFAULT 120,
        CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_Reservations_Table_Date ON dbo.Reservations(TableId, ReservedAt);
END
GO

-- Preorders
IF OBJECT_ID('dbo.Preorders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Preorders (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        UserId       INT NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        MenuItemId   INT NOT NULL FOREIGN KEY REFERENCES dbo.MenuItems(Id),
        ForDate      DATE NOT NULL,
        Quantity     INT NOT NULL CHECK (Quantity > 0),
        CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_Preorders_Item_Date ON dbo.Preorders(MenuItemId, ForDate);
END
GO

-- Helper view: Remaining availability per item per date
IF OBJECT_ID('dbo.v_MenuAvailability', 'V') IS NOT NULL
    DROP VIEW dbo.v_MenuAvailability;
GO
CREATE VIEW dbo.v_MenuAvailability AS
SELECT
    mi.Id              AS MenuItemId,
    mi.Name            AS MenuItemName,
    d.ForDate,
    mi.DailyLimit,
    ISNULL(SUM(d.Quantity), 0) AS Ordered,
    mi.DailyLimit - ISNULL(SUM(d.Quantity), 0) AS Remaining
FROM dbo.MenuItems mi
LEFT JOIN dbo.Preorders d
    ON d.MenuItemId = mi.Id
GROUP BY mi.Id, mi.Name, mi.DailyLimit, d.ForDate;
GO
CREATE TABLE Reservations (
                              Id INT IDENTITY PRIMARY KEY,
                              UserId INT NOT NULL,
                              TableId INT NOT NULL,
                              ReservationDate DATE NOT NULL,
                              ReservationTime TIME NOT NULL,
                              GuestCount INT NOT NULL,
                              SpecialRequests NVARCHAR(500),
                              CreatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE ReservationMenuItems (
                                      Id INT IDENTITY PRIMARY KEY,
                                      ReservationId INT NOT NULL,
                                      MenuItemId INT NOT NULL,

                                      FOREIGN KEY (ReservationId) REFERENCES Reservations(Id),
                                      FOREIGN KEY (MenuItemId) REFERENCES MenuItems(Id)
);

