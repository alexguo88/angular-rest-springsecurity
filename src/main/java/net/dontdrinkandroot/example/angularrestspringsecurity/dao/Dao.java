package net.dontdrinkandroot.example.angularrestspringsecurity.dao;

import net.dontdrinkandroot.example.angularrestspringsecurity.entity.Entity;

import java.util.List;

/**
 *
 *
 * @param <T>
 * @param <I>
 */
public interface Dao<T extends Entity, I> {
    /**
     *
     * @return
     */
    List<T> findAll();

    T find(I id);

    T save(T entity);

    void delete(I id);

    void delete(T entity);
}
