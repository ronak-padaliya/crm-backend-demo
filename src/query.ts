import { QueryResult } from 'pg';
import db from './helper/database';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies



export const authQueries = {

  getUserByEmail: (email: string): Promise<QueryResult> => {
    return db.query(
      `SELECT u.id, u.email, u.password, r.role, 
              u.org_id AS orgId, 
              o.org_name AS orgName,
              u.admin_id AS adminId,
              u.supervisor_id AS supervisorId
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE u.email = $1`,
      [email]
    );
  },

  getUserById: (userId: string): Promise<QueryResult> => {
    return db.query('SELECT password FROM users WHERE id = $1', [userId]);
  },

  deletePasswordResetToken: (userId: string): Promise<QueryResult> => {
    return db.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [userId]
    );
  },

  createPasswordResetToken: (userId: string, token: string, otp: string): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO password_reset_tokens (user_id, token, otp, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [userId, token, otp]
    );
  },

  verifyOTP: (email: string, otp: string): Promise<QueryResult> => {
    return db.query(
      `SELECT t.*, u.email, u.role_id 
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.otp = $2 AND t.expires_at > NOW() AND u.email = $1`,
      [email, otp]
    );
  },

  updatePassword: (hashedPassword: string, email: string): Promise<QueryResult> => {
    return db.query(
      `UPDATE users SET password = $1 WHERE email = $2`,
      [hashedPassword, email]
    );
  },

  markRegistrationKeyUsed: (registrationKey: string): Promise<QueryResult> => {
    return db.query(
      'UPDATE superadmin_registration_keys SET is_used = TRUE, used_at = NOW() WHERE registration_key = $1',
      [registrationKey]
    );
  },
  storeRefreshToken: (userId: string, refreshToken: string): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [userId, refreshToken]
    );
  },

};


// ------------------------------organization--------------------------
export const organizationQueries = {
  getAllOrganizations: (): Promise<QueryResult> => {
    return db.query('SELECT * FROM organizations ORDER BY created_at DESC');
  },

  getOrganizationById: (id: string): Promise<QueryResult> => {
    return db.query('SELECT * FROM organizations WHERE id = $1', [id]);
  },

  createOrganization: (org_name: string): Promise<QueryResult> => {
    return db.query(
      'INSERT INTO organizations (org_name) VALUES ($1) RETURNING *',
      [org_name]
    );
  },

  updateOrganization: (org_name: string, id: string): Promise<QueryResult> => {
    return db.query(
      'UPDATE organizations SET org_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [org_name, id]
    );
  },

  deleteOrganization: (id: string): Promise<QueryResult> => {
    return db.query('DELETE FROM organizations WHERE id = $1 RETURNING *', [id]);
  },

  // getFilteredOrganizations: async (
  //   page: number, 
  //   limit: number, 
  //   orgName?: string
  // ): Promise<QueryResult> => {
  //   const offset = (page - 1) * limit;

  //   // Validate that page and limit are numbers
  //   if (isNaN(page) || isNaN(limit)) {
  //     throw new Error("Page and limit must be numbers");
  //   }

  //   const query = `
  //   SELECT * FROM organizations
  //   WHERE ($1::TEXT IS NULL OR org_name ILIKE '%' || $1::TEXT || '%')
  //   ORDER BY created_at DESC
  //   LIMIT $2::INT OFFSET $3::INT
  // `;
  //   const values = [orgName || null, Number(limit), Number(offset)];
  //   return await db.query(query, values);
  // },

  getFilteredOrganizations: async (
    page: number, 
    limit: number, 
    search?: string
): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);

    const query = `
        SELECT * FROM organizations
        WHERE (COALESCE($1, '') = '' OR org_name ILIKE '%' || $1 || '%')
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `;

    const values = [search || null, limit, offset];
    return await db.query(query, values);
},

  
  
  
};
// -----------Admin-------------

export const adminQueries = {

  insertAdmin: async (email: string, hashedPassword: string, firstName: string, lastName: string, phone: string, orgName: string): Promise<QueryResult> => {
    // Start a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert the organization first
      const orgResult = await client.query(
        'INSERT INTO organizations (org_name) VALUES ($1) RETURNING id',
        [orgName]
      );
      const orgId = orgResult.rows[0].id;

      // Now insert the admin with the new orgId and default role as 'admin'
      const adminResult = await client.query(
        `INSERT INTO users (email, password, firstname, lastname, role_id, phone, org_id)
         VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE role = 'admin'), $5, $6) 
         RETURNING id`,
        [email, hashedPassword, firstName, lastName, phone, orgId]
      );

      await client.query('COMMIT');
      return adminResult;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  checkExistingEmail: (email: string): Promise<QueryResult> => {
    return db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
  },

  // getAllAdmins: async (page: number, limit: number, orgId: number): Promise<QueryResult> => {
  //   const offset = (page - 1) * limit;
  //   return db.query(
  //     `SELECT u.*, o.id AS org_id, o.org_name, r.role AS role_name
  //      FROM users u
  //      LEFT JOIN organizations o ON u.org_id = o.id
  //      LEFT JOIN roles r ON u.role_id = r.id
  //      WHERE u.role_id = (SELECT id FROM roles WHERE role = 'admin')
  //        AND u.is_deleted = FALSE
  //        AND u.org_id = $3
  //      ORDER BY u.id 
  //      LIMIT $1 OFFSET $2`, [limit, offset, orgId]
  //   );
  // },

  getAllAdmins: async (page: number, limit: number, orgId?: number): Promise<QueryResult> => {
    const offset = (page - 1) * limit;
    const query = `
      SELECT u.*, o.id AS org_id, o.org_name, r.role AS role_name, COUNT(*) OVER () AS total_count
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.role_id = (SELECT id FROM roles WHERE role = 'admin')
        AND u.is_deleted = FALSE
        ${orgId ? 'AND u.org_id = $3' : ''}
      ORDER BY u.id 
      LIMIT $1 OFFSET $2`;
    
    const params = orgId ? [limit, offset, orgId] : [limit, offset];
    return db.query(query, params);
},

  getAdminById: async (id: number, orgId?: number): Promise<QueryResult> => {
    return db.query(
      `SELECT u.*, o.id AS org_id, o.org_name, r.role AS role_name
       FROM users u
       LEFT JOIN organizations o ON u.org_id = o.id
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 
         AND u.role_id = (SELECT id FROM roles WHERE role = 'admin')
         ${orgId ? 'AND u.org_id = $2' : ''}`,
      orgId ? [id, orgId] : [id]
    );
  },

  updateAdmin: async (id: number, firstName: string, lastName: string, phone: string, orgId?: number): Promise<QueryResult> => {
    return db.query(
      `UPDATE users 
       SET firstname = COALESCE($1, firstname),
           lastname = COALESCE($2, lastname),
           phone = COALESCE($3, phone)
       WHERE id = $4 
         AND role_id = (SELECT id FROM roles WHERE role = 'admin')
         ${orgId ? 'AND org_id = $5' : ''} 
       RETURNING *`,
      orgId ? [firstName, lastName, phone, id, orgId] : [firstName, lastName, phone, id]
    );
  },

  deleteAdmin: async (id: number, orgId?: number): Promise<QueryResult> => {
    return db.query(
      `UPDATE users 
       SET is_deleted = TRUE 
       WHERE id = $1 
         AND role_id = (SELECT id FROM roles WHERE role = 'admin')
         ${orgId ? 'AND org_id = $2' : ''} 
       RETURNING *`,
      orgId ? [id, orgId] : [id]
    );
  },
 

//   getFilteredAdmins: async (
//     page: number, 
//     limit: number, 
//     orgId: number | undefined, 
//     search?: string
// ): Promise<QueryResult> => {
//     const offset = (page - 1) * limit;
//     const query = `
//         SELECT u.*, r.role
//         FROM users u
//         JOIN roles r ON u.role_id = r.id
//         WHERE u.role_id = (SELECT id FROM roles WHERE role = 'admin')
//           AND u.is_deleted = FALSE
//           AND (COALESCE($1, '') = '' 
//               OR u.email ILIKE '%' || $1 || '%'
//               OR u.firstname || ' ' || u.lastname ILIKE '%' || $1 || '%'
//               OR u.lastname || ' ' || u.firstname ILIKE '%' || $1 || '%'
//               OR u.phone ILIKE '%' || $1 || '%')
//           AND (COALESCE($2, 0) = 0 OR u.org_id = $2)  -- Filter by orgId if not SuperAdmin
//         ORDER BY u.created_at DESC
//         LIMIT $3 OFFSET $4
//     `;

//     const values = [search || null, orgId ?? 0, limit, offset];
//     return await db.query(query, values);
// },

getFilteredAdmins: async (
  page: number, 
  limit: number, 
  orgId: number | undefined, 
  search?: string
): Promise<QueryResult> => {
  const offset = (page - 1) * limit;
  const query = `
      SELECT u.*, r.role, COUNT(*) OVER () AS total_count
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.role_id = (SELECT id FROM roles WHERE role = 'admin')
        AND u.is_deleted = FALSE
        AND (COALESCE($1, '') = '' 
            OR u.email ILIKE '%' || $1 || '%'
            OR u.firstname || ' ' || u.lastname ILIKE '%' || $1 || '%'
            OR u.lastname || ' ' || u.firstname ILIKE '%' || $1 || '%'
            OR u.phone ILIKE '%' || $1 || '%')
        AND (COALESCE($2, 0) = 0 OR u.org_id = $2)  -- Filter by orgId if not SuperAdmin
      ORDER BY u.created_at DESC
      LIMIT $3 OFFSET $4
  `;

  const values = [search || null, orgId ?? 0, limit, offset];
  return await db.query(query, values);
},

  

  acceptNotification: async (notificationId: number, approverId: number) => {
    // Check if the notification is already processed
    const checkQuery = `
      SELECT approved_by, rejected_by 
      FROM salescardnotification 
      WHERE id = $1
    `;
    const checkResult = await db.query(checkQuery, [notificationId]);

    if (checkResult.rows.length === 0) {
        throw new Error('Notification not found');
    }

    const { approved_by, rejected_by } = checkResult.rows[0];
    if (approved_by || rejected_by) {
        throw new Error('Notification already processed');
    }

    // Proceed to update if not processed
    const query = 'UPDATE salescardnotification SET approved_by = $1 WHERE id = $2 RETURNING *';
    const values = [approverId, notificationId];
    return await db.query(query, values);
  },
  rejectNotification: async (notificationId: number, rejecterId: number) => {
    // Check if the notification is already processed
    const checkQuery = `
      SELECT approved_by, rejected_by 
      FROM salescardnotification 
      WHERE id = $1
    `;
    const checkResult = await db.query(checkQuery, [notificationId]);

    if (checkResult.rows.length === 0) {
        throw new Error('Notification not found');
    }

    const { approved_by, rejected_by } = checkResult.rows[0];
    if (approved_by || rejected_by) {
        throw new Error('Notification already processed');
    }

    // Proceed to update if not processed
    const query = 'UPDATE salescardnotification SET rejected_by = $1 WHERE id = $2 RETURNING *';
    const values = [rejecterId, notificationId];
    return await db.query(query, values);
  },
  

};


// ------------------------------supervisor--------------------------

export const supervisorQueries = {

  insertSupervisor: (email: string, hashedPassword: string, firstName: string, lastName: string, phone: string, orgId?: number, adminId?: number): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO users (email, password, firstname, lastname, role_id, phone, org_id, admin_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE role = 'supervisor'), $5, $6, $7) 
       RETURNING id`,
      [email, hashedPassword, firstName, lastName, phone, orgId, adminId || null]
    );
  },

  checkExistingEmail: (email: string): Promise<QueryResult> => {
    return db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
  },

  getRoleIdByName: (roleName: string): Promise<QueryResult> => {
    return db.query(
      'SELECT id FROM roles WHERE role = $1',
      [roleName]
    );
  },
  getAllSupervisors: async (page: number, limit: number, orgId: number | null): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);
    const query = `
      SELECT u.*, o.org_name, r.role, a.firstname AS admin_firstname, a.lastname AS admin_lastname, 
             a.email AS admin_email, a.phone AS admin_phone
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users a ON u.admin_id = a.id
      WHERE u.role_id = (SELECT id FROM roles WHERE role = 'supervisor') 
        AND u.is_deleted = FALSE
        ${orgId ? 'AND u.org_id = $3::int' : ''}
      ORDER BY u.id 
      LIMIT $1 OFFSET $2`;
    const params = orgId ? [limit, offset, orgId] : [limit, offset];
    return db.query(query, params);
},

  getSupervisorById: async (id: string): Promise<QueryResult> => {
    return db.query(`
      SELECT u.*, o.org_name, r.role, 
             a.firstname AS admin_firstname, a.lastname AS admin_lastname, 
             a.email AS admin_email, a.phone AS admin_phone
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users a ON u.admin_id = a.id
      WHERE u.id = $1::int AND u.role_id = (SELECT id FROM roles WHERE role = 'supervisor')`,
      [id]
    );
  },

  updateSupervisor: (id: string, firstName: string, lastName: string, phone: string): Promise<QueryResult> => {
    return db.query(
      `UPDATE users 
       SET firstname = COALESCE($1, firstname),
           lastname = COALESCE($2, lastname),
           phone = COALESCE($3, phone)
       WHERE id = $4 
       AND role_id = (SELECT id FROM roles WHERE role = 'supervisor') 
       RETURNING *`,
      [firstName, lastName, phone, id]
    );
  },

  deleteSupervisor: (id: string): Promise<QueryResult> => {
    return db.query(
      "UPDATE users SET is_deleted = TRUE WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role = 'supervisor') RETURNING *",
      [id]
    );
  },

  // getFilteredSupervisors: async (
  //   page: number, 
  //   limit: number, 
  //   orgId: number | undefined,  // Undefined for SuperAdmin
  //   email?: string, 
  //   name?: string,  
  //   phone?: string
  // ): Promise<QueryResult> => {
  //   const offset = (page - 1) * limit;
  
  //   const query = `
  //     SELECT u.*, o.org_name, r.role, 
  //            a.firstname AS admin_firstname, a.lastname AS admin_lastname, 
  //            a.email AS admin_email, a.phone AS admin_phone
  //     FROM users u
  //     LEFT JOIN organizations o ON u.org_id = o.id
  //     LEFT JOIN roles r ON u.role_id = r.id
  //     LEFT JOIN users a ON u.admin_id = a.id
  //     WHERE u.role_id = (SELECT id FROM roles WHERE role = 'supervisor')
  //       AND u.is_deleted = FALSE
  //       AND (COALESCE($1, '') = '' OR u.email ILIKE '%' || $1 || '%')
  //       AND (COALESCE($2, '') = '' 
  //             OR u.firstname || ' ' || u.lastname ILIKE '%' || $2 || '%'
  //             OR u.lastname || ' ' || u.firstname ILIKE '%' || $2 || '%')
  //       AND (COALESCE($3, 0) = 0 OR u.org_id = $3)  -- Filter by orgId if not SuperAdmin
  //       AND (COALESCE($4, '') = '' OR u.phone = $4)
  //     ORDER BY u.created_at DESC
  //     LIMIT $5 OFFSET $6
  //   `;
  
  //   const values = [email || null, name || null, orgId ?? 0, phone || null, limit, offset];
  //   return await db.query(query, values);
  // },

  getFilteredSupervisors: async (
    page: number, 
    limit: number, 
    orgId: number | undefined,  
    search?: string
): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);

    const query = `
        SELECT u.*, o.org_name, r.role, 
               a.firstname AS admin_firstname, a.lastname AS admin_lastname, 
               a.email AS admin_email, a.phone AS admin_phone
        FROM users u
        LEFT JOIN organizations o ON u.org_id = o.id
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN users a ON u.admin_id = a.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role = 'supervisor')
          AND u.is_deleted = FALSE
          AND (COALESCE($1, '') = '' 
              OR u.email ILIKE '%' || $1 || '%'
              OR u.firstname || ' ' || u.lastname ILIKE '%' || $1 || '%'
              OR u.lastname || ' ' || u.firstname ILIKE '%' || $1 || '%'
              OR u.phone ILIKE '%' || $1 || '%')
          AND (COALESCE($2, 0) = 0 OR u.org_id = $2)  
        ORDER BY u.created_at DESC
        LIMIT $3 OFFSET $4
    `;

    const values = [search || null, orgId ?? 0, limit, offset];
    return await db.query(query, values);
},

  
  
};



// ------------------------------salesperson--------------------------

export const salespersonQueries = {

  insertSalesperson: (email: string, hashedPassword: string, firstName: string, lastName: string, phone: string, orgId?: number, supervisorId?: number): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO users (email, password, firstname, lastname, role_id, phone, org_id, supervisor_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE role = 'salesperson'), $5, $6, $7) 
       RETURNING id`,
      [email, hashedPassword, firstName, lastName, phone, orgId, supervisorId || null]
    );
  },

  checkExistingEmail: (email: string): Promise<QueryResult> => {
    return db.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
  },

 getAllSalespersons: async (page: number, limit: number, orgId: number | null): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);
    const query = `
      SELECT u.*, o.org_name, r.role, s.firstname AS supervisor_firstname, s.lastname AS supervisor_lastname, 
             s.email AS supervisor_email, s.phone AS supervisor_phone
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users s ON u.supervisor_id = s.id
      WHERE u.role_id = (SELECT id FROM roles WHERE role = 'salesperson') 
        AND u.is_deleted = FALSE
        ${orgId ? 'AND u.org_id = $3' : ''}
      ORDER BY u.id 
      LIMIT $1 OFFSET $2`;
    
    const params = orgId ? [limit, offset, orgId] : [limit, offset];
    return db.query(query, params);
  },

  getSalespersonById: async (id: string): Promise<QueryResult> => {
    return db.query(`
      SELECT u.*, o.org_name, r.role, 
             s.firstname AS supervisor_firstname, s.lastname AS supervisor_lastname, 
             s.email AS supervisor_email, s.phone AS supervisor_phone
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users s ON u.supervisor_id = s.id
      WHERE u.id = $1 AND u.role_id = (SELECT id FROM roles WHERE role = 'salesperson')
    `, [id]);
  },

  updateSalesperson: (id: string, firstName: string, lastName: string, phone: string): Promise<QueryResult> => {
    return db.query(
      `UPDATE users 
       SET firstname = COALESCE($1, firstname),
           lastname = COALESCE($2, lastname),
           phone = COALESCE($3, phone)
       WHERE id = $4 
       AND role_id = (SELECT id FROM roles WHERE role = 'salesperson') 
       RETURNING *`,
      [ firstName, lastName, phone, id]
    );
  },

  deleteSalesperson: (id: string): Promise<QueryResult> => {
    return db.query(
      "UPDATE users SET is_deleted = TRUE WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role = 'salesperson') RETURNING *",
      [id]
    );
  },

  // getFilteredSalespersons: async (
  //   page: number, 
  //   limit: number, 
  //   orgId: number | null, 
  //   email?: string, 
  //   name?: string,  // Accept full name in any order
  //   phone?: string
  // ): Promise<QueryResult> => {
  //   const offset = (page - 1) * limit;
  //   const query = `
  //     SELECT u.*, o.org_name, r.role, 
  //            s.firstname AS supervisor_firstname, s.lastname AS supervisor_lastname, 
  //            s.email AS supervisor_email, s.phone AS supervisor_phone
  //     FROM users u
  //     LEFT JOIN organizations o ON u.org_id = o.id
  //     LEFT JOIN roles r ON u.role_id = r.id
  //     LEFT JOIN users s ON u.supervisor_id = s.id
  //     WHERE u.role_id = (SELECT id FROM roles WHERE role = 'salesperson')
  //       AND u.is_deleted = FALSE
  //       AND (COALESCE($1, '') = '' OR u.email ILIKE '%' || $1 || '%')
  //       AND (COALESCE($2, '') = '' 
  //             OR u.firstname || ' ' || u.lastname ILIKE '%' || $2 || '%'
  //             OR u.lastname || ' ' || u.firstname ILIKE '%' || $2 || '%')
  //       AND (COALESCE($3, 0) = 0 OR u.org_id = $3)  -- Filter by orgId if not SuperAdmin
  //       AND (COALESCE($4, '') = '' OR u.phone = $4)
  //     ORDER BY u.created_at DESC
  //     LIMIT $5 OFFSET $6
  //   `;
  
  //   const values = [email || null, name || null, orgId ?? 0, phone || null, limit, offset];
  //   return await db.query(query, values);
  // },

  getFilteredSalespersons: async (
    page: number, 
    limit: number, 
    orgId: number | null,  
    search?: string
): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);

    const query = `
        SELECT u.*, o.org_name, r.role, 
               s.firstname AS supervisor_firstname, s.lastname AS supervisor_lastname, 
               s.email AS supervisor_email, s.phone AS supervisor_phone
        FROM users u
        LEFT JOIN organizations o ON u.org_id = o.id
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN users s ON u.supervisor_id = s.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role = 'salesperson')
          AND u.is_deleted = FALSE
          AND (COALESCE($1, '') = '' 
              OR u.email ILIKE '%' || $1 || '%'
              OR u.firstname || ' ' || u.lastname ILIKE '%' || $1 || '%'
              OR u.lastname || ' ' || u.firstname ILIKE '%' || $1 || '%'
              OR u.phone ILIKE '%' || $1 || '%')
          AND (COALESCE($2, 0) = 0 OR u.org_id = $2)  
        ORDER BY u.created_at DESC
        LIMIT $3 OFFSET $4
    `;

    const values = [search || null, orgId ?? 0, limit, offset];
    return await db.query(query, values);
},

  
};

export const rolesPermissionsQueries = {


  getPermissionsByRole: async (userId: string): Promise<QueryResult> => {
      return db.query(`
        SELECT 
          json_build_object(
            'user', json_build_object(
              'id', rp.user_id,
              'firstname', u.firstname,
              'lastname', u.lastname,
              'role', r.role
            ),
            'module', json_build_object(
              'id', rp.module_id,
              'name', m.name
            ),
            'permissions', (
              SELECT json_agg(
                json_build_object(
                  'name', p.name
                )
              )
              FROM permissions p
              WHERE p.id = ANY(rp.permission_ids)
            ),
            'created_at', rp.created_at,
            'updated_at', rp.updated_at
          ) as permission_details
        FROM role_permissions rp
        JOIN users u ON u.id = rp.user_id
        JOIN roles r ON r.id = u.role_id
        JOIN modules m ON m.id = rp.module_id
        WHERE rp.user_id = $1
      `, [userId]);
    },

  assignRolePermissions: async (userId: number, moduleId: number, permissionIds: number[]): Promise<QueryResult> => {
    // Ensure read permission (1) is included
    if (!permissionIds.includes(1)) {
      throw new Error("Read permission is mandatory for access.");
    }

    return db.query(
      `INSERT INTO role_permissions (user_id, module_id, permission_ids)
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, module_id) DO UPDATE 
       SET permission_ids = EXCLUDED.permission_ids, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [userId, moduleId, permissionIds]
    );
  },

  removeRolePermissions: async (userId: number, moduleId: number): Promise<QueryResult> => {
    return db.query(`
      DELETE FROM role_permissions 
      WHERE user_id = $1 AND module_id = $2
      RETURNING *
    `, [userId, moduleId]);
  },

  updateRolePermissions: async (userId: number, moduleId: number, permissionIds: number[]): Promise<QueryResult> => {
    return db.query(
      `UPDATE role_permissions 
       SET permission_ids = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND module_id = $2
       RETURNING *`,
      [userId, moduleId, permissionIds]
    );
  },

};

export const salesCardQueries = {
  // Fetch sales cards (excluding deleted)
  getSalesCards: async (page: number, limit: number, orgId: number): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);
    return db.query(
      `SELECT sc.*, u.firstname AS salesperson_firstname, u.lastname AS salesperson_lastname, 
              c.firstname AS customer_firstname, c.lastname AS customer_lastname,
              c.phone AS customer_phone, c.email AS customer_email,
              ss.name AS status_name
       FROM sales_cards sc
       JOIN users u ON sc.user_id = u.id
       JOIN customers c ON sc.customer_id = c.id
       JOIN sales_status ss ON sc.status_id = ss.id
       WHERE sc.is_deleted = FALSE AND u.org_id = $3
       ORDER BY sc.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, orgId]
    );
  },

  // Get a single sales card by ID
  getSalesCardById: async (id: number): Promise<QueryResult> => {
    return db.query(
      `SELECT sc.*, u.firstname AS salesperson_firstname, u.lastname AS salesperson_lastname, 
              c.firstname AS customer_firstname, c.lastname AS customer_lastname,
              ss.name AS status_name
       FROM sales_cards sc
       JOIN users u ON sc.user_id = u.id
       JOIN customers c ON sc.customer_id = c.id
       JOIN sales_status ss ON sc.status_id = ss.id
       WHERE sc.id = $1 AND sc.is_deleted = FALSE`,
      [id]
    );
  },

getLatestSalesCard: async (
  customerPhone: number
): Promise<QueryResult> => {
  const queryParams: number[] = [customerPhone];

  let query = `
    SELECT sc.*, 
           u.firstname AS salesperson_firstname, 
           u.lastname AS salesperson_lastname, 
           c.firstname AS customer_firstname, 
           c.lastname AS customer_lastname, 
           c.phone AS customer_phone, 
           ss.name AS status_name
    FROM sales_cards sc
    JOIN users u ON sc.user_id = u.id
    JOIN customers c ON sc.customer_id = c.id
    JOIN sales_status ss ON sc.status_id = ss.id
    WHERE sc.is_deleted = FALSE
    AND ss.name != 'Order Confirmed'
    AND c.phone = $1
    ORDER BY sc.updated_at DESC, sc.created_at DESC
    LIMIT 2;`;

  console.log("Executing Query:", query);
  console.log("Query Parameters:", queryParams);

  return db.query(query, queryParams);
},







  // Add a new sales card
  addSalesCard: async (
    userId: number,
    customerId: number,
    statusId: number,
    title: string,
    description: string
  ): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO sales_cards (user_id, customer_id, status_id, title, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, customerId, statusId, title, description]
    );
  },

  // Update an existing sales card
    updateSalesCard: async (
        id: number,
        statusId: number,
        title: string,
        description: string,
    ): Promise<QueryResult> => {
        return db.query(
            `UPDATE sales_cards 
             SET status_id = $1, 
                 title = $2, 
                 description = $3, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 
             RETURNING *`,
            [statusId, title, description, id]
        );
    },

    updateSalesCardForOrderConfirmed: async (
      id: number, 
      statusId: number, 
      title: string, 
      description: string, 
      imageUrl: string
    ): Promise<QueryResult> => {
      const query = `
        UPDATE sales_cards
        SET status_id = $2, title = $3, description = $4, image_url = $5
        WHERE id = $1
        RETURNING *;
      `;
      const values = [id, statusId, title, description, imageUrl];
      return await db.query(query, values);
    },

  softDeleteSalesCard: async (id: number): Promise<QueryResult> => {
    return db.query(
      `UPDATE sales_cards SET is_deleted = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
  },

  updateSalesCardStatus: async (id: number, statusId: number): Promise<QueryResult> => {
    return db.query(
      `UPDATE sales_cards 
       SET status_id = $1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING *`,
      [statusId, id]
    );
  },

  getCustomerById: async (customerId: number): Promise<QueryResult> => {
    return db.query(`SELECT firstname, lastname FROM customers WHERE id = $1`, [customerId]);
},

getSupervisorIdByUserId: async (userId: number): Promise<{ supervisor_id: number } | null> => {
  const result = await db.query(`SELECT supervisor_id FROM users WHERE id = $1`, [userId]);
  return result.rows.length ? result.rows[0] : null;
},

getAdminIdBySupervisorId: async (supervisorId: number): Promise<{ admin_id: number } | null> => {
  const result = await db.query(`SELECT admin_id FROM users WHERE id = $1`, [supervisorId]);
  return result.rows.length ? result.rows[0] : null;
}

  //   return db.query(
  //     `SELECT a.id AS adminId, a.email, a.firstname, a.lastname
  //      FROM users a
  //      JOIN users s ON s.admin_id = a.id
  //      WHERE s.id = $1 AND s.role_id = (SELECT id FROM roles WHERE role = 'supervisor')`,
  //     [supervisorId]
  //   );
  // },
  
//   getFilteredSalesCards: async (page: number, limit: number, userId: string | null, statusId: string | null, title: string | null): Promise<QueryResult<any>> => {
//     const offset = (page - 1) * limit;
//     const query = `
//       SELECT sc.*, 
//              u.firstname AS salesperson_firstname, 
//              u.lastname AS salesperson_lastname, 
//              c.firstname AS customer_firstname, 
//              c.lastname AS customer_lastname, 
//              c.phone AS customer_phone,  // Added customer phone
//              ss.name AS status_name
//       FROM sales_cards sc
//       LEFT JOIN users u ON sc.user_id = u.id
//       LEFT JOIN customers c ON sc.customer_id = c.id
//       LEFT JOIN sales_status ss ON sc.status_id = ss.id
//       WHERE sc.is_deleted = FALSE
//         AND ($1::text IS NULL OR sc.user_id = $1)
//         AND ($2::text IS NULL OR sc.status_id = $2)
//         AND ($3::text IS NULL OR sc.title ILIKE '%' || $3 || '%')
//       ORDER BY sc.created_at DESC
//       LIMIT $4 OFFSET $5
//     `;
//     const values = [userId, statusId, title, limit, offset];
//     return await db.query(query, values);
// },
};

export const customerQueries = {
  // Fetch all customers (excluding deleted ones)
  getCustomers: async (page: number, limit: number): Promise<QueryResult> => {
    const offset = Math.max(0, (page - 1) * limit);
    return db.query(
      `SELECT * FROM customers WHERE is_deleted = FALSE ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  },

  // Get a single customer by ID
  getCustomerById: async (id: number): Promise<QueryResult> => {
    return db.query(
      `SELECT * FROM customers WHERE id = $1 AND is_deleted = FALSE`,
      [id]
    );
  },

  // Add a new customer
  addCustomer: async (firstname: string, lastname: string, email: string, phone: string): Promise<QueryResult> => {
    return db.query(
      `INSERT INTO customers (firstname, lastname, email, phone) VALUES ($1, $2, $3, $4) RETURNING *`,
      [firstname, lastname, email, phone]
    );
  },

  // Update an existing customer
  updateCustomer: async (id: number, firstname?: string, lastname?: string, email?: string, phone?: string): Promise<QueryResult> => {
    return db.query(
      `UPDATE customers 
       SET firstname = COALESCE($1, firstname),
           lastname = COALESCE($2, lastname),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [firstname, lastname, email, phone, id]
    );
  },
  softDeleteCustomer: async (id: number): Promise<QueryResult> => {
    return db.query(
      `UPDATE customers SET is_deleted = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
  }
};

export const followUpIterationQueries = {
  checkExistingIteration: async (iteration: string, orgId: number) => {
    return db.query('SELECT * FROM followup_iterations WHERE iteration = $1 AND orgId = $2', [iteration, orgId]);
  },
  
  insertFollowUpIteration: async (iteration: string, days: number, orgId: number) => {
    return db.query(
      'INSERT INTO followup_iterations (iteration, days, orgId) VALUES ($1, $2, $3) RETURNING *',
      [iteration, days, orgId]
    );
  },

  getAllFollowUpIterations: async (page: number, limit: number, orgId: number) => {
    const offset = Math.max(0, (page - 1) * limit);
    return db.query(
      'SELECT * FROM followup_iterations WHERE orgId = $1 ORDER BY id ASC LIMIT $2 OFFSET $3',
      [orgId, limit, offset]
    );
  },
  
  getFollowUpIterationById: async (id: string, orgId: number): Promise<QueryResult> => {
    return db.query('SELECT * FROM followup_iterations WHERE id = $1 AND orgId = $2', [id, orgId]);
  },
  
  updateFollowUpIteration: async (id: number, iteration: string, days: number, orgId: number) => {
    return db.query(
      'UPDATE followup_iterations SET iteration = $1, days = $2 WHERE id = $3 AND orgId = $4 RETURNING *',
      [iteration, days, id, orgId]
    );
  },
  
  deleteFollowUpIteration: async (id: number, orgId: number) => {
    return db.query('DELETE FROM followup_iterations WHERE id = $1 AND orgId = $2', [id, orgId]);
  }
};


export const notificationQueries = {
//   createNotification: async (salesCardId: number, senderId: number, imageUrl: string) => {
//     return db.query(`
//         INSERT INTO notificationForSalesCard (sales_card_id, sender_id, receiver_role, image_url, message)
//         VALUES ($1, $2, 'supervisor', $3, 'Approval required for sales card.')
//         RETURNING *;
//     `, [salesCardId, senderId, imageUrl]);
// },
createNotification: async (salesCardId: number, senderId: number, receiverRole: string, receiverId: number, imageUrl: string) => {
  return db.query(`
      INSERT INTO notificationForSalesCard (sales_card_id, sender_id, receiver_role, receiver_id, image_url, message)
      VALUES ($1, $2, $3, $4, $5, 'Approval required for sales card.')
      RETURNING *;
  `, [salesCardId, senderId, receiverRole, receiverId, imageUrl]);
},

getAdminBySupervisorId: async (supervisorId: number) => {
  return db.query(`
      SELECT admin_id 
      FROM users 
      WHERE id = $1 
        AND role_id = (SELECT id FROM roles WHERE role = 'supervisor');
  `, [supervisorId]);
},
  getNotificationBySalesCardId: async (salesCardId: number) => {
      return db.query(`SELECT * FROM notificationForSalesCard WHERE sales_card_id = $1;`, [salesCardId]);
  },

  getNotificationById: async (id: number) => {
      return db.query(`SELECT * FROM notificationForSalesCard WHERE id = $1;`, [id]);
  },

  approveNotification: async (id: number, approvedBy: string) => {
      return db.query(`
          UPDATE notificationForSalesCard 
          SET status = 'approved', updated_at = NOW()
          WHERE id = $1
          RETURNING *;
      `, [id]);
  },
  rejectNotification: async (id: number) => {
    return db.query(`
        UPDATE notificationForSalesCard 
        SET status = 'rejected', updated_at = NOW()
        WHERE id = $1
        RETURNING *;
    `, [id]);
},
//   removeNotification: async (salesCardId: number, role: string) => {
//     return db.query(
//         `DELETE FROM notificationForSalesCard WHERE sales_card_id = $1 AND receiver_role = $2`,
//         [salesCardId, role]
//     );
// }
removeNotification: async (salesCardId: number, receiverRole: string) => {
  return db.query(`
      DELETE FROM notificationForSalesCard
      WHERE sales_card_id = $1 AND receiver_role = $2;
  `, [salesCardId, receiverRole]);
}
};