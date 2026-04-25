from rest_framework import serializers
from .models import Tournament, Round


class TournamentSerializer(serializers.ModelSerializer):
    custom_image = serializers.ImageField(
        use_url=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model  = Tournament
        fields = '__all__'


class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Round
        fields = '__all__'
        read_only_fields = ['tournament', 'created_at']
