"""
Спільні міксини та хелпери для серіалізаторів.
"""
from rest_framework import serializers


def get_display_name(user):
    if not user:
        return 'Видалений користувач'
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


def reaction_counts(reactions_qs, user_id):
    counts = {}
    my_reaction = None
    for r in reactions_qs:
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
        if r.user_id == user_id:
            my_reaction = r.emoji
    return counts, my_reaction


class TechRequirementsMixin:
    """
    Валідація полів tech_requirements і must_have.
    Підключається до Round і Task серіалізаторів.
    """
    def validate_tech_requirements(self, value):
        if value is None:
            return value
        if not isinstance(value, list):
            raise serializers.ValidationError("tech_requirements має бути списком.")
        for item in value:
            if not isinstance(item, dict) or 'category' not in item or 'value' not in item:
                raise serializers.ValidationError(
                    "Кожен елемент tech_requirements має містити поля 'category' і 'value'."
                )
        return value

    def validate_must_have(self, value):
        if value is None:
            return value
        if not isinstance(value, list):
            raise serializers.ValidationError("must_have має бути списком.")
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError("Кожен елемент must_have має бути рядком.")
        return value
