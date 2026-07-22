from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0053_coursefeedback_satisfaction_score'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='GamificationRewardClaim',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reward_key', models.CharField(max_length=60)),
                ('xp_bonus', models.PositiveIntegerField(default=0)),
                ('claimed_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gamification_reward_claims', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-claimed_at', '-id'],
            },
        ),
        migrations.AddConstraint(
            model_name='gamificationrewardclaim',
            constraint=models.UniqueConstraint(fields=('user', 'reward_key'), name='unique_gamification_reward_claim'),
        ),
    ]
