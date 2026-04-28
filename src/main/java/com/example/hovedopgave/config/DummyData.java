package com.example.hovedopgave.config;

import com.example.hovedopgave.model.WashingMachine;
import com.example.hovedopgave.repository.WashingMachineRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Configuration
public class DummyData {

    @Bean
    CommandLineRunner initData(
            WashingMachineRepository washingMachineRepo
    ) {
        return args -> {
            washingMachineRepo.deleteAll();

            /*final Random random = new Random();
            final List<WashingMachine> washingMachines = new ArrayList<>();
            for (int i = 0; i < 15; i++) {
                final WashingMachine washingMachine = new WashingMachine();
                washingMachine.status = random.nextInt(67);
                washingMachines.add(washingMachine);
            }

            washingMachineRepo.saveAll(washingMachines);*/

        };
    }
}
