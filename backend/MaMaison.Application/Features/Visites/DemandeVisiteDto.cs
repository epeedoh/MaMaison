namespace MaMaison.Application.Features.Visites;

public record SoumettreDemandeVisiteCommand(
    Guid BienId,
    string Nom,
    string Telephone,
    string? Email,
    DateTime? DateSouhaitee,
    string? Commentaire
);

public record DemandeVisiteCreeeDto(Guid Id, string Message);
