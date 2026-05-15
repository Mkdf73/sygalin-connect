<%text>
Revision identifiers, used by Alembic.
</%text>
revision = '<%= rev_id %>'
down_revision = <%= repr(down_revision) %>
branch_labels = <%= repr(branch_labels) %>
depends_on = <%= repr(depends_on) %>

from alembic import op
import sqlalchemy as sa

<% if render_as_batch %>
from alembic import op


def upgrade():
    with op.batch_alter_table(None):
<% else %>

def upgrade():
<% endif %>
<% if upgrade_ops %>
<%= upgrade_ops %>
<% else %>
    pass
<% endif %>


def downgrade():
<% if downgrade_ops %>
<%= downgrade_ops %>
<% else %>
    pass
<% endif %>
