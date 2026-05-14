# api/serializers/__init__.py
# Реекспортує всі серіалізатори — існуючий код у views не потребує змін.

from .mixins import TechRequirementsMixin, get_display_name, reaction_counts

from .tournament import (
    TournamentSerializer,
    TournamentMemberSerializer,
    JoinByTokenSerializer,
)
from .team import (
    UserCompactSerializer,
    TeamMemberSerializer,
    TeamSerializer,
    TeamCreateSerializer,
    TeamUpdateSerializer,
    TeamInviteMemberSerializer,
    TeamAdminSerializer,
)
from .task import (
    TaskLinkSerializer,
    TaskAttachmentSerializer,
    TaskSerializer,
)
from .round import (
    RoundLinkSerializer,
    RoundAttachmentSerializer,
    RoundSerializer,
)
from .submission import (
    SubmissionLinkSerializer,
    SubmissionAttachmentSerializer,
    SubmissionSerializer,
)
from .grade import (
    GradeSerializer,
    GradeWriteSerializer,
    JuryAssignmentSerializer,
    JurySubmissionSerializer,
)
from .announcement import (
    AnnouncementCommentSerializer,
    AnnouncementSerializer,
)

__all__ = [
    # mixins / helpers
    'TechRequirementsMixin', 'get_display_name', 'reaction_counts',
    # tournament
    'TournamentSerializer', 'TournamentMemberSerializer', 'JoinByTokenSerializer',
    # team
    'UserCompactSerializer', 'TeamMemberSerializer', 'TeamSerializer',
    'TeamCreateSerializer', 'TeamUpdateSerializer',
    'TeamInviteMemberSerializer', 'TeamAdminSerializer',
    # task
    'TaskLinkSerializer', 'TaskAttachmentSerializer', 'TaskSerializer',
    # round
    'RoundLinkSerializer', 'RoundAttachmentSerializer', 'RoundSerializer',
    # submission
    'SubmissionLinkSerializer', 'SubmissionAttachmentSerializer', 'SubmissionSerializer',
    # grade
    'GradeSerializer', 'GradeWriteSerializer',
    'JuryAssignmentSerializer', 'JurySubmissionSerializer',
    # announcement
    'AnnouncementCommentSerializer', 'AnnouncementSerializer',
]
