package com.example.hovedopgave.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.util.Random;

@Getter
@Setter
@Entity
public class WashingMachine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    public String status;//Ledig, Booket eller Ude af drift

    public WashingMachine() {
    }


}
