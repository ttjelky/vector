# Цей файл робить папку models/ пакетом
# і реекспортує всі класи так, щоб існуючий код не потрібно було міняти.
#
# Будь-який імпорт виду:
#   from tournaments.models import Tournament, Team, ...
# продовжить працювати без змін.

from .tournament import (
    Tournament,
    TournamentMember,
    TOURNAMENT_ROLE_CHOICES,
    TOKEN_FIELD_TO_ROLE,
    generate_invite_pin,
)
from .team import (
    Team,
    TeamMember,
    TeamUploadPermission,
)
from .round import (
    Round,
    RoundLink,
    RoundAttachment,
)
from .task import (
    Task,
    TaskLink,
    TaskAttachment,
)
from .submission import (
    Submission,
    SubmissionLink,
    SubmissionAttachment,
)
from .grade import (
    Grade,
    JuryAssignment,
)
from .certificate import (
    CertificateTemplate,
    Certificate,
    CERT_TYPE_CHOICES,
)
from .announcement import (
    Announcement,
    AnnouncementComment,
    AnnouncementReaction,
    ANNOUNCEMENT_TARGET_CHOICES,
)
from .jury import (
    JuryGradingCriterion,
)

__all__ = [
    # tournament
    "Tournament",
    "TournamentMember",
    "TOURNAMENT_ROLE_CHOICES",
    "TOKEN_FIELD_TO_ROLE",
    "generate_invite_pin",
    # team
    "Team",
    "TeamMember",
    "TeamUploadPermission",
    # round
    "Round",
    "RoundLink",
    "RoundAttachment",
    # task
    "Task",
    "TaskLink",
    "TaskAttachment",
    # submission
    "Submission",
    "SubmissionLink",
    "SubmissionAttachment",
    # grade
    "Grade",
    "JuryAssignment",
    # certificate
    "CertificateTemplate",
    "Certificate",
    "CERT_TYPE_CHOICES",
    # announcement
    "Announcement",
    "AnnouncementComment",
    "AnnouncementReaction",
    "ANNOUNCEMENT_TARGET_CHOICES",
    # jury
    "JuryGradingCriterion",
]
