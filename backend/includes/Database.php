<?php

class Database
{
    private static ?Database $instance = null;
    private ?PDO $pdo = null;

    private function __construct() {}

    private function __clone() {}

    public function __wakeup()
    {
        throw new RuntimeException('Cannot unserialize singleton');
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        if ($this->pdo === null) {
            $this->pdo = getDatabaseConnection();
        }
        return $this->pdo;
    }

    public function query(string $sql): PDOStatement
    {
        return $this->getConnection()->query($sql);
    }

    public function prepare(string $sql): PDOStatement
    {
        return $this->getConnection()->prepare($sql);
    }

    public function execute(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public function fetch(string $sql, array $params = []): ?array
    {
        $stmt = $this->execute($sql, $params);
        $result = $stmt->fetch();
        return $result !== false ? $result : null;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->execute($sql, $params)->fetchAll();
    }

    public function fetchColumn(string $sql, array $params = []): mixed
    {
        return $this->execute($sql, $params)->fetchColumn();
    }

    public function insert(string $sql, array $params = []): string
    {
        $this->execute($sql, $params);
        return $this->getConnection()->lastInsertId();
    }

    public function beginTransaction(): bool
    {
        return $this->getConnection()->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->getConnection()->commit();
    }

    public function rollBack(): bool
    {
        return $this->getConnection()->rollBack();
    }

    public function lastInsertId(): string
    {
        return $this->getConnection()->lastInsertId();
    }
}
