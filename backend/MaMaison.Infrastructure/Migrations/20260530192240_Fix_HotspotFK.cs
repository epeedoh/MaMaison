using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaMaison.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fix_HotspotFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HotspotsVisite_PointsVisite3D_PointVisite3DId",
                table: "HotspotsVisite");

            migrationBuilder.DropIndex(
                name: "IX_HotspotsVisite_PointVisite3DId",
                table: "HotspotsVisite");

            migrationBuilder.DropColumn(
                name: "PointVisite3DId",
                table: "HotspotsVisite");

            migrationBuilder.AlterColumn<string>(
                name: "Libelle",
                table: "HotspotsVisite",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_HotspotsVisite_PointVisiteId",
                table: "HotspotsVisite",
                column: "PointVisiteId");

            migrationBuilder.AddForeignKey(
                name: "FK_HotspotsVisite_PointsVisite3D_PointVisiteId",
                table: "HotspotsVisite",
                column: "PointVisiteId",
                principalTable: "PointsVisite3D",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HotspotsVisite_PointsVisite3D_PointVisiteId",
                table: "HotspotsVisite");

            migrationBuilder.DropIndex(
                name: "IX_HotspotsVisite_PointVisiteId",
                table: "HotspotsVisite");

            migrationBuilder.AlterColumn<string>(
                name: "Libelle",
                table: "HotspotsVisite",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AddColumn<Guid>(
                name: "PointVisite3DId",
                table: "HotspotsVisite",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_HotspotsVisite_PointVisite3DId",
                table: "HotspotsVisite",
                column: "PointVisite3DId");

            migrationBuilder.AddForeignKey(
                name: "FK_HotspotsVisite_PointsVisite3D_PointVisite3DId",
                table: "HotspotsVisite",
                column: "PointVisite3DId",
                principalTable: "PointsVisite3D",
                principalColumn: "Id");
        }
    }
}
