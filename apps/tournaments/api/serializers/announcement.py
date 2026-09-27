from rest_framework import serializers

from ...models import Announcement, AnnouncementComment, TournamentMember
from .mixins import get_display_name, reaction_counts


def author_avatar_url(author, request):
    profile = getattr(author, "profile", None)
    if not profile or not profile.avatar:
        return None
    try:
        url = profile.avatar.url
    except ValueError:
        return None
    if request:
        return request.build_absolute_uri(url)
    return url


class AnnouncementCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    author_id = serializers.IntegerField(read_only=True)
    is_mine     = serializers.SerializerMethodField()
    replies     = serializers.SerializerMethodField()
    reactions   = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model  = AnnouncementComment
        fields = [
            'id', 'text', 'author_name', 'author_avatar', 'author_id', 'is_mine',
            'created_at', 'replies', 'reactions', 'my_reaction',
        ]
        read_only_fields = [
            'id', 'author_name', 'author_avatar', 'author_id', 'is_mine',
            'created_at', 'replies', 'reactions', 'my_reaction',
        ]

    def get_author_name(self, obj):
        return get_display_name(obj.author)

    def get_author_avatar(self, obj):
        return author_avatar_url(obj.author, self.context.get('request'))

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and obj.author_id == request.user.id)

    def get_replies(self, obj):
        if obj.parent_id is not None:
            return []
        qs = (
            obj.replies
            .select_related('author', 'author__profile')
            .prefetch_related('reactions')
        )
        return AnnouncementCommentSerializer(qs, many=True, context=self.context).data

    def get_reactions(self, obj):
        counts, _ = reaction_counts(obj.reactions.all(), self.context['request'].user.id)
        return counts

    def get_my_reaction(self, obj):
        _, my = reaction_counts(obj.reactions.all(), self.context['request'].user.id)
        return my


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    author_id = serializers.IntegerField(read_only=True)
    author_role = serializers.SerializerMethodField()
    comments    = serializers.SerializerMethodField()
    reactions   = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model  = Announcement
        fields = [
            'id', 'title', 'body', 'target_role',
            'author_name', 'author_avatar', 'author_id', 'author_role', 'created_at',
            'comments', 'reactions', 'my_reaction',
        ]
        read_only_fields = [
            'id', 'author_name', 'author_avatar', 'author_id', 'author_role',
            'created_at', 'comments', 'reactions', 'my_reaction',
        ]

    def get_author_name(self, obj):
        return get_display_name(obj.author)

    def get_author_avatar(self, obj):
        return author_avatar_url(obj.author, self.context.get('request'))

    def get_author_role(self, obj):
        if not obj.author:
            return None
        m = TournamentMember.objects.filter(
            tournament=obj.tournament, user=obj.author
        ).first()
        return m.role if m else None

    def get_comments(self, obj):
        qs = (
            obj.comments
            .filter(parent__isnull=True)
            .select_related('author', 'author__profile')
            .prefetch_related(
                'reactions',
                'replies__author',
                'replies__author__profile',
                'replies__reactions',
            )
        )
        return AnnouncementCommentSerializer(qs, many=True, context=self.context).data

    def get_reactions(self, obj):
        counts, _ = reaction_counts(obj.reactions.all(), self.context['request'].user.id)
        return counts

    def get_my_reaction(self, obj):
        _, my = reaction_counts(obj.reactions.all(), self.context['request'].user.id)
        return my
