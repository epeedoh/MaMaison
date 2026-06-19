FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS base
RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# ── Build ──────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY ["backend/MaMaison.Api/MaMaison.Api.csproj",                 "backend/MaMaison.Api/"]
COPY ["backend/MaMaison.Application/MaMaison.Application.csproj", "backend/MaMaison.Application/"]
COPY ["backend/MaMaison.Domain/MaMaison.Domain.csproj",           "backend/MaMaison.Domain/"]
COPY ["backend/MaMaison.Infrastructure/MaMaison.Infrastructure.csproj", "backend/MaMaison.Infrastructure/"]
RUN dotnet restore "backend/MaMaison.Api/MaMaison.Api.csproj"

COPY backend/ backend/
RUN dotnet publish "backend/MaMaison.Api/MaMaison.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    -p:UseAppHost=false

# ── Runtime ───────────────────────────────────────────────────
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MaMaison.Api.dll"]
