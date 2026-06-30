FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY OnlineExam.Api.csproj ./
RUN dotnet restore OnlineExam.Api.csproj

COPY . .
RUN dotnet publish OnlineExam.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "OnlineExam.Api.dll"]
