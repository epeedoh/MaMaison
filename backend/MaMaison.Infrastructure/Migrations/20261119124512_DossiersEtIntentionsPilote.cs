using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaMaison.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DossiersEtIntentionsPilote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MotifRejet",
                table: "Locations",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ResponsableVisitesId",
                table: "Locations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TitulaireId",
                table: "Locations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateConfirmee",
                table: "DemandesVisite",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nature",
                table: "DemandesVisite",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reponse",
                table: "DemandesVisite",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MotifRejet",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "ResponsableVisitesId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "TitulaireId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "DateConfirmee",
                table: "DemandesVisite");

            migrationBuilder.DropColumn(
                name: "Nature",
                table: "DemandesVisite");

            migrationBuilder.DropColumn(
                name: "Reponse",
                table: "DemandesVisite");
        }
    }
}
